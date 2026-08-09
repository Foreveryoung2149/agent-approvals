import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { authMiddleware } from "./middleware/auth.js";
import {
  authRateLimiter,
  contactRateLimiter,
  publicDecisionRateLimiter,
  rateLimiter,
} from "./middleware/rate-limiter.js";
import { usageTracker } from "./middleware/usage-tracker.js";
import { validateEnvironment } from "./lib/environment.js";
import { migrateLegacyApprovalTokens } from "./lib/tokens.js";
import { startApprovalExpiryWorker, stopApprovalExpiryWorker } from "./lib/approval-lifecycle.js";
import { startWebhookWorker, stopWebhookWorker } from "./lib/webhook.js";
import { startEmailDeliveryWorker, stopEmailDeliveryWorker } from "./lib/email-outbox.js";
import {
  startAuthEmailDeliveryWorker,
  stopAuthEmailDeliveryWorker,
} from "./lib/auth-email-outbox.js";
import { approvalsRouter } from "./routes/approvals.js";
import { authRouter } from "./routes/auth.js";
import { contactRouter } from "./routes/contact.js";
import { apiKeysRouter } from "./routes/api-keys.js";
import { decisionRequestsRouter } from "./routes/decision-requests.js";
import { discoveryRouter } from "./routes/discovery.js";
import { webhooksRouter } from "./routes/webhooks.js";

validateEnvironment();

const app = express();
const port = process.env.PORT || 3002;
app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS || 1));

let prisma = null;
if (process.env.DATABASE_URL) {
  prisma = new PrismaClient();
  const migratedTokens = await migrateLegacyApprovalTokens({ prisma });
  if (migratedTokens > 0) {
    console.log(`[Nodsend] Secured ${migratedTokens} legacy decision token(s).`);
  }
}

app.use(helmet({ referrerPolicy: { policy: "no-referrer" } }));
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map(o => o.trim().replace(/\/$/, ""))
  : ["http://localhost:3000"];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  req.requestId = req.get("X-Request-Id") || crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  res.setHeader("Nodsend-Request-Id", req.requestId);
  next();
});
app.use((req, _res, next) => {
  req.prisma = prisma;
  next();
});

// Health check — no auth required
// Public discovery resources are read-only and expose only the published API
// contract. They deliberately contain no workspace or credential metadata.
app.use(discoveryRouter);

app.get("/health", async (_req, res) => {
  if (!prisma) {
    return res.status(503).json({ ok: false, service: "nodsend-api", database: "not_configured" });
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ ok: true, service: "nodsend-api", database: "ready" });
  } catch {
    return res.status(503).json({ ok: false, service: "nodsend-api", database: "unavailable" });
  }
});

// Public contact intake is deliberately narrow, rate limited, and does not
// require an account or expose mail-provider errors to the browser.
app.use("/v1/contact", contactRateLimiter, contactRouter);

const databaseRequired = (req, res, next) => {
  if (!req.prisma) {
    return res.status(503).json({
      error: { code: "database_required", message: "Database is not configured." },
    });
  }
  return next();
};

// Human decision routes use a scoped, opaque token and never accept an agent
// API key as authority to approve its own request.
app.use(
  "/v1/decision-requests",
  databaseRequired,
  publicDecisionRateLimiter,
  decisionRequestsRouter,
);

// Temporary compatibility for already-issued frontend links. Canonical clients
// should use /v1/decision-requests; only token-bearing decision paths enter here.
app.use("/v1/approvals", databaseRequired, (req, res, next) => {
  const hasDecisionToken = Boolean(req.query.token || req.query.t || req.get("Nodsend-Decision-Token"));
  const isDecisionPath = /^\/[^/]+(?:\/(?:approve|reject|decision))?$/.test(req.path);
  if (hasDecisionToken && isDecisionPath) {
    return publicDecisionRateLimiter(req, res, () => decisionRequestsRouter(req, res, next));
  }
  return next();
});

// Agent API keys and dashboard sessions share read access; only the public
// decision router above can approve or reject.
app.use("/v1/approvals", authMiddleware, rateLimiter, usageTracker, approvalsRouter);

// Auth routes (session-based, no API key needed)
app.use("/v1/auth", (req, res, next) => (
  req.path === "/logout" ? next() : databaseRequired(req, res, next)
), (req, res, next) => {
  const sensitive = req.method === "POST" && [
    "/signup",
    "/login",
    "/login/2fa",
    "/verify-email",
    "/resend-verification",
    "/forgot-password",
    "/reset-password",
  ].includes(req.path);
  return sensitive ? authRateLimiter(req, res, next) : next();
}, authRouter);

// API key management (session-based, no API key needed)
app.use("/v1/api-keys", databaseRequired, apiKeysRouter);

// Webhook management (session-based, no API key needed)
app.use("/v1/webhooks", databaseRequired, webhooksRouter);

// Global error handler
app.use((err, req, res, _next) => {
  console.error("[Nodsend] Unhandled error:", {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    error: err?.message || String(err),
  });
  res.status(500).json({
    error: { code: "internal_error", message: "An unexpected error occurred." },
  });
});

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`[Nodsend] API server running on port ${port}`);
  console.log(`[Nodsend] Database: ${prisma ? "connected" : "not configured (set DATABASE_URL)"}`);
});

if (prisma) {
  startApprovalExpiryWorker({ prisma });
  startWebhookWorker({ prisma });
  startEmailDeliveryWorker({ prisma });
  startAuthEmailDeliveryWorker({ prisma });
}

async function shutdown(signal) {
  console.log(`[Nodsend] ${signal} received; shutting down.`);
  stopApprovalExpiryWorker();
  stopWebhookWorker();
  stopEmailDeliveryWorker();
  stopAuthEmailDeliveryWorker();
  server.close(async () => {
    await prisma?.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
