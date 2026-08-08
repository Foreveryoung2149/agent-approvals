import { Router } from "express";
import { z } from "zod";
import { expireApproval, transitionDecision } from "../lib/approval-lifecycle.js";
import { hashApprovalToken } from "../lib/tokens.js";

export const decisionRequestsRouter = Router();

decisionRequestsRouter.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  next();
});

const rejectSchema = z.object({
  reason: z.string().trim().max(2000).optional().nullable(),
  token: z.string().min(32).max(256).optional(),
}).strict();

const decisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().trim().max(2000).optional().nullable(),
  token: z.string().min(32).max(256).optional(),
}).strict();

decisionRequestsRouter.get("/:id", async (req, res, next) => {
  try {
    const tokenHash = decisionTokenHash(req);
    if (!tokenHash) return invalidToken(res);

    let approval = await req.prisma.approval.findFirst({
      where: { id: req.params.id, approvalToken: tokenHash },
    });
    if (!approval) return invalidToken(res);

    if (approval.status === "PENDING" && approval.expiresAt <= new Date()) {
      approval = await expireApproval({ prisma: req.prisma, approval });
    }
    if (approval.status === "EXPIRED") {
      return res.status(410).json({ error: { code: "expired", message: "This request has expired." } });
    }

    return res.json(publicApproval(approval));
  } catch (error) {
    return next(error);
  }
});

decisionRequestsRouter.post("/:id/approve", async (req, res, next) => {
  try {
    const tokenHash = decisionTokenHash(req);
    if (!tokenHash) return invalidToken(res);
    const result = await transitionDecision({
      prisma: req.prisma,
      id: req.params.id,
      tokenHash,
      decision: "APPROVED",
    });
    return decisionResponse(res, result);
  } catch (error) {
    return next(error);
  }
});

decisionRequestsRouter.post("/:id/decision", async (req, res, next) => {
  try {
    const input = decisionSchema.parse(req.body || {});
    const tokenHash = decisionTokenHash(req, input.token);
    if (!tokenHash) return invalidToken(res);
    const result = await transitionDecision({
      prisma: req.prisma,
      id: req.params.id,
      tokenHash,
      decision: input.decision === "approved" ? "APPROVED" : "REJECTED",
      reason: input.decision === "rejected" ? input.reason || null : null,
    });
    return decisionResponse(res, result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: { code: "invalid_request", message: error.issues[0]?.message || "Invalid request." },
      });
    }
    return next(error);
  }
});

decisionRequestsRouter.post("/:id/reject", async (req, res, next) => {
  try {
    const input = rejectSchema.parse(req.body || {});
    const tokenHash = decisionTokenHash(req, input.token);
    if (!tokenHash) return invalidToken(res);
    const result = await transitionDecision({
      prisma: req.prisma,
      id: req.params.id,
      tokenHash,
      decision: "REJECTED",
      reason: input.reason || null,
    });
    return decisionResponse(res, result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: { code: "invalid_request", message: error.issues[0]?.message || "Invalid request." },
      });
    }
    return next(error);
  }
});

function decisionTokenHash(req, bodyToken = null) {
  const token = req.get("Nodsend-Decision-Token") || req.query.token || req.query.t || bodyToken;
  return hashApprovalToken(token);
}

function invalidToken(res) {
  return res.status(404).json({
    error: { code: "not_found", message: "Decision request not found or token is invalid." },
  });
}

function decisionResponse(res, result) {
  if (result.outcome === "not_found") return invalidToken(res);
  if (result.outcome === "expired") {
    return res.status(410).json({ error: { code: "expired", message: "This request has expired." } });
  }
  if (result.outcome === "conflict") {
    return res.status(409).json({
      error: {
        code: "already_decided",
        message: `This request has already been ${(result.approval?.status || "decided").toLowerCase()}.`,
      },
    });
  }

  return res.json(fullApproval(result.approval));
}

function publicApproval(approval) {
  return {
    id: approval.id,
    agent_name: approval.agentName,
    action: approval.action,
    summary: approval.summary,
    details: approval.details,
    status: approval.status.toLowerCase(),
    expires_at: approval.expiresAt.toISOString(),
  };
}

function fullApproval(approval) {
  return {
    id: approval.id,
    status: approval.status.toLowerCase(),
    action: approval.action,
    summary: approval.summary,
    details: approval.details || {},
    channel: approval.channel.toLowerCase(),
    recipient: approval.recipient,
    agent_name: approval.agentName,
    external_id: approval.externalId || null,
    metadata: approval.metadata || {},
    decided_by: approval.decidedBy || null,
    rejection_reason: approval.rejectionReason || null,
    expires_at: approval.expiresAt.toISOString(),
    decided_at: approval.decidedAt?.toISOString() || null,
    created_at: approval.createdAt.toISOString(),
    updated_at: approval.updatedAt.toISOString(),
  };
}
