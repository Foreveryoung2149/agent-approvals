import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { PrismaClient } from "@prisma/client";
import { authMiddleware } from "./middleware/auth.js";
import { rateLimiter } from "./middleware/rate-limiter.js";
import { usageTracker } from "./middleware/usage-tracker.js";
import { approvalsRouter } from "./routes/approvals.js";
import { authRouter } from "./routes/auth.js";
import { apiKeysRouter } from "./routes/api-keys.js";
import { webhooksRouter } from "./routes/webhooks.js";

const app = express();
const port = process.env.PORT || 3002;

let prisma = null;
if (process.env.DATABASE_URL) {
  prisma = new PrismaClient();
}

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || "*" }));
app.use(express.json({ limit: "1mb" }));
app.use((req, _res, next) => {
  req.prisma = prisma;
  next();
});

// Health check — no auth required
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "nodsend-api", database: prisma ? "connected" : "not_configured" });
});

// API routes — all require API key auth + rate limiting + usage tracking
app.use("/v1/approvals", authMiddleware, rateLimiter, usageTracker, approvalsRouter);

// Auth routes (session-based, no API key needed)
app.use("/v1/auth", authRouter);

// API key management (session-based, no API key needed)
app.use("/v1/api-keys", apiKeysRouter);

// Webhook management (session-based, no API key needed)
app.use("/v1/webhooks", webhooksRouter);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error("[Nodsend] Unhandled error:", err);
  res.status(500).json({
    error: { code: "internal_error", message: "An unexpected error occurred." },
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`[Nodsend] API server running on port ${port}`);
  console.log(`[Nodsend] Database: ${prisma ? "connected" : "not configured (set DATABASE_URL)"}`);
  console.log(`[Nodsend] Dev key: ${process.env.DEV_API_KEY || "nod_dev_devkey"}`);
});