import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { expireApproval } from "../lib/approval-lifecycle.js";
import { encryptSecret } from "../lib/secret-box.js";
import { enqueueApprovalWebhookEvent } from "../lib/webhook.js";
import { generateApprovalToken, hashApprovalToken } from "../lib/tokens.js";
import { normalizePlan, PLAN_LIMITS } from "../middleware/rate-limiter.js";

export const approvalsRouter = Router();

const createSchema = z.object({
  action: z.string().trim().min(1).max(200).regex(/^[A-Za-z0-9_.:-]+$/),
  summary: z.string().trim().min(1).max(500),
  details: z.record(z.any()).optional().default({}),
  channel: z.literal("email").default("email"),
  recipient: z.string().trim().email().max(320),
  expires_in: z.string().regex(/^\d+(s|m|h|d)$/).default("1h"),
  webhook_id: z.string().trim().min(1).max(100).optional().nullable(),
  agent_name: z.string().trim().min(1).max(200).optional(),
  external_id: z.string().trim().min(1).max(255).optional().nullable(),
  metadata: z.record(z.any()).optional().default({}),
}).strict();

const listSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "expired", "cancelled"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().trim().min(1).max(500).optional(),
}).strict();

function parseExpiry(expiresIn) {
  const [, value, unit] = /^(\d+)(s|m|h|d)$/.exec(expiresIn);
  const milliseconds = Number(value) * { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit];
  if (!Number.isSafeInteger(milliseconds) || milliseconds < 60_000 || milliseconds > 30 * 86_400_000) {
    throw new ApiError(400, "invalid_expiry", "expires_in must be between 1 minute and 30 days.");
  }
  return milliseconds;
}

/** POST /v1/approvals — create an agent approval request. */
approvalsRouter.post("/", async (req, res, next) => {
  try {
    if (!req.apiKey?.userId || req.apiKey.userId === "dev") {
      throw new ApiError(401, "no_user", "API key must be associated with a verified account.");
    }

    const input = createSchema.parse(req.body || {});
    const idempotencyKey = normalizeIdempotencyKey(req.get("Idempotency-Key"), { required: true });
    const requestFingerprint = createRequestFingerprint(input);
    const existing = await req.prisma.approval.findUnique({
      where: { userId_idempotencyKey: { userId: req.apiKey.userId, idempotencyKey } },
    });
    if (existing) return replayOrConflict(res, existing, requestFingerprint);

    const expiresAt = new Date(Date.now() + parseExpiry(input.expires_in));
    const rawDecisionToken = generateApprovalToken();
    const approvalToken = hashApprovalToken(rawDecisionToken);
    const agentName = input.agent_name || req.apiKey.keyPrefix || "agent";

    const approval = await createWithQuota({
      prisma: req.prisma,
      userId: req.apiKey.userId,
      plan: req.apiKey.plan,
      data: {
        apiKeyId: req.apiKey.principalType === "api_key" ? req.apiKey.id : null,
        agentName,
        action: input.action,
        summary: input.summary,
        details: input.details || {},
        externalId: input.external_id || null,
        metadata: input.metadata || {},
        status: "PENDING",
        channel: "EMAIL",
        recipient: input.recipient.toLowerCase(),
        expiresAt,
        webhookId: input.webhook_id || null,
        webhookUrl: null,
        approvalToken,
        idempotencyKey,
        requestFingerprint,
        emailDelivery: {
          create: { tokenCiphertext: encryptSecret(rawDecisionToken) },
        },
      },
    });

    return res.status(201).json(agentApproval(approval));
  } catch (error) {
    if (error?.code === "P2002" && req.get("Idempotency-Key")) {
      const existing = await req.prisma.approval.findUnique({
        where: {
          userId_idempotencyKey: {
            userId: req.apiKey.userId,
            idempotencyKey: normalizeIdempotencyKey(req.get("Idempotency-Key")),
          },
        },
      });
      if (existing) return replayOrConflict(res, existing, createRequestFingerprint(createSchema.parse(req.body || {})));
      throw new ApiError(409, "idempotency_conflict", "A conflicting approval request already exists.");
    }
    return routeError(error, res, next);
  }
});

/** GET /v1/approvals/:id — get approval status for an agent or dashboard session. */
approvalsRouter.get("/:id", async (req, res, next) => {
  try {
    let approval = await req.prisma.approval.findFirst({
      where: { id: req.params.id, userId: req.apiKey.userId },
    });
    if (!approval) throw new ApiError(404, "not_found", "Approval not found.");
    if (approval.status === "PENDING" && approval.expiresAt <= new Date()) {
      approval = await expireApproval({ prisma: req.prisma, approval });
    }
    return res.json(agentApproval(approval));
  } catch (error) {
    return routeError(error, res, next);
  }
});

/** GET /v1/approvals — list approvals. */
approvalsRouter.get("/", async (req, res, next) => {
  try {
    const input = listSchema.parse(req.query);
    const cursorId = input.cursor ? decodeCursor(input.cursor) : null;
    if (cursorId) {
      const ownedCursor = await req.prisma.approval.findFirst({
        where: { id: cursorId, userId: req.apiKey.userId },
        select: { id: true },
      });
      if (!ownedCursor) throw new ApiError(400, "invalid_cursor", "cursor is invalid or expired.");
    }
    const approvals = await req.prisma.approval.findMany({
      where: {
        userId: req.apiKey.userId,
        ...(input.status ? { status: input.status.toUpperCase() } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: input.limit + 1,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
    });
    const hasMore = approvals.length > input.limit;
    const page = hasMore ? approvals.slice(0, input.limit) : approvals;
    return res.json({
      approvals: page.map((approval) => agentApproval(approval)),
      next_cursor: hasMore ? encodeCursor(page.at(-1).id) : null,
    });
  } catch (error) {
    return routeError(error, res, next);
  }
});

/** POST /v1/approvals/:id/cancel — requesting agent cancels a pending request. */
approvalsRouter.post("/:id/cancel", async (req, res, next) => {
  try {
    const idempotencyKey = normalizeIdempotencyKey(req.get("Idempotency-Key"), { required: true });
    const requestFingerprint = createRequestFingerprint({ operation: "cancel", approval_id: req.params.id });
    const result = await req.prisma.$transaction(async (tx) => {
      const approval = await tx.approval.findFirst({
        where: { id: req.params.id, userId: req.apiKey.userId },
      });
      if (!approval) throw new ApiError(404, "not_found", "Approval not found.");
      if (approval.cancelIdempotencyKey === idempotencyKey) {
        if (approval.cancelRequestFingerprint !== requestFingerprint) {
          throw new ApiError(409, "idempotency_conflict", "This Idempotency-Key was used for a different cancellation.");
        }
        return { approval, replayed: true };
      }

      const changed = await tx.approval.updateMany({
        where: { id: approval.id, userId: req.apiKey.userId, status: "PENDING" },
        data: {
          status: "CANCELLED",
          cancelIdempotencyKey: idempotencyKey,
          cancelRequestFingerprint: requestFingerprint,
        },
      });
      if (changed.count !== 1) {
        const current = await tx.approval.findUnique({ where: { id: approval.id } });
        if (
          current?.cancelIdempotencyKey === idempotencyKey
          && current.cancelRequestFingerprint === requestFingerprint
        ) {
          return { approval: current, replayed: true };
        }
        throw new ApiError(409, "already_decided", `Approval has already been ${approval.status.toLowerCase()}.`);
      }

      const updated = await tx.approval.findUnique({ where: { id: approval.id } });
      await tx.approvalLog.create({ data: { approvalId: approval.id, event: "cancelled" } });
      await enqueueApprovalWebhookEvent({
        prisma: tx,
        approval: updated,
        eventType: "approval.cancelled",
      });
      return { approval: updated, replayed: false };
    });
    if (result.replayed) res.setHeader("Idempotent-Replayed", "true");
    return res.json(agentApproval(result.approval));
  } catch (error) {
    if (error?.code === "P2002") {
      return res.status(409).json({
        error: { code: "idempotency_conflict", message: "This Idempotency-Key was used for another cancellation." },
      });
    }
    return routeError(error, res, next);
  }
});

/** GET /v1/approvals/:id/logs — scoped audit trail. */
approvalsRouter.get("/:id/logs", async (req, res, next) => {
  try {
    const approval = await req.prisma.approval.findFirst({
      where: { id: req.params.id, userId: req.apiKey.userId },
    });
    if (!approval) throw new ApiError(404, "not_found", "Approval not found.");
    const logs = await req.prisma.approvalLog.findMany({
      where: { approvalId: approval.id },
      orderBy: { createdAt: "asc" },
    });
    return res.json({
      approval_id: approval.id,
      logs: logs.map((log) => ({
        id: log.id,
        event: log.event,
        metadata: log.metadata || {},
        created_at: log.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return routeError(error, res, next);
  }
});

async function createWithQuota({ prisma, userId, plan, data }) {
  const normalizedPlan = normalizePlan(plan);
  const monthlyLimit = PLAN_LIMITS[normalizedPlan].monthlyApprovals;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        if (data.webhookId) {
          const webhook = await tx.webhook.findFirst({
            where: { id: data.webhookId, userId, active: true },
            select: { id: true },
          });
          if (!webhook) throw new ApiError(400, "invalid_webhook", "webhook_id is not an active webhook owned by this account.");
        }

        if (monthlyLimit !== null) {
          const now = new Date();
          const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
          const used = await tx.approval.count({ where: { userId, createdAt: { gte: monthStart } } });
          if (used >= monthlyLimit) {
            throw new ApiError(402, "monthly_quota_exceeded", `Monthly approval quota exceeded for ${normalizedPlan} plan.`);
          }
        }

        const approval = await tx.approval.create({ data: { userId, ...data } });
        await tx.approvalLog.create({
          data: {
            approvalId: approval.id,
            event: "created",
            metadata: { agentName: approval.agentName, action: approval.action },
          },
        });
        await enqueueApprovalWebhookEvent({
          prisma: tx,
          approval,
          eventType: "approval.created",
        });
        return approval;
      }, { isolationLevel: "Serializable" });
    } catch (error) {
      if (error?.code === "P2034" && attempt < 2) continue;
      throw error;
    }
  }
  throw new ApiError(503, "transaction_unavailable", "Could not create approval. Try again.");
}

function agentApproval(approval) {
  return {
    id: approval.id,
    agent_name: approval.agentName,
    action: approval.action,
    summary: approval.summary,
    details: approval.details || {},
    external_id: approval.externalId || null,
    metadata: approval.metadata || {},
    status: approval.status.toLowerCase(),
    channel: approval.channel.toLowerCase(),
    recipient: approval.recipient,
    decided_by: approval.decidedBy || null,
    decided_at: approval.decidedAt?.toISOString() || null,
    rejection_reason: approval.rejectionReason || null,
    expires_at: approval.expiresAt.toISOString(),
    created_at: approval.createdAt.toISOString(),
    updated_at: approval.updatedAt?.toISOString?.(),
  };
}

export function normalizeIdempotencyKey(value, { required = false } = {}) {
  if (!value) {
    if (required) throw new ApiError(400, "missing_idempotency_key", "Idempotency-Key header is required.");
    return null;
  }
  const normalized = String(value).trim();
  if (normalized.length < 8 || normalized.length > 255) {
    throw new ApiError(400, "invalid_idempotency_key", "Idempotency-Key must contain 8 to 255 characters.");
  }
  return normalized;
}

function replayOrConflict(res, approval, requestFingerprint) {
  if (!approval.requestFingerprint || approval.requestFingerprint !== requestFingerprint) {
    throw new ApiError(
      409,
      "idempotency_conflict",
      "This Idempotency-Key was already used with a different request body.",
    );
  }
  res.setHeader("Idempotent-Replayed", "true");
  return res.status(201).json(agentApproval(approval));
}

export function createRequestFingerprint(input) {
  return crypto.createHash("sha256").update(stableJson(input)).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function encodeCursor(id) {
  return Buffer.from(JSON.stringify({ id }), "utf8").toString("base64url");
}

function decodeCursor(cursor) {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (!decoded?.id || typeof decoded.id !== "string") throw new Error("invalid");
    return decoded.id;
  } catch {
    throw new ApiError(400, "invalid_cursor", "cursor is invalid or expired.");
  }
}

function routeError(error, res, next) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      error: { code: "invalid_request", message: error.issues[0]?.message || "Invalid request." },
    });
  }
  if (error instanceof ApiError) {
    return res.status(error.status).json({ error: { code: error.code, message: error.message } });
  }
  return next(error);
}

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
