import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { generateApprovalToken, verifyApprovalToken } from "../lib/tokens.js";
import { sendApprovalEmail } from "../lib/email.js";
import { deliverApprovalWebhook } from "../lib/webhook.js";

export const approvalsRouter = Router();

const createSchema = z.object({
  action: z.string().min(1).max(200),
  summary: z.string().min(1).max(500),
  details: z.record(z.any()).optional().default({}),
  channel: z.enum(["email", "slack", "dashboard"]).default("email"),
  recipient: z.string().min(1).max(500),
  expires_in: z.string().default("1h"),
  webhook_url: z.string().url().optional().nullable(),
  agent_name: z.string().max(200).optional(),
});

function parseExpiry(expiresIn) {
  const match = /^(\d+)(s|m|h|d)$/.exec(expiresIn);
  if (!match) return 60 * 60 * 1000;
  const num = parseInt(match[1], 10);
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return num * multipliers[match[2]];
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
}

/** POST /v1/approvals — Agent creates an approval request. */
approvalsRouter.post("/", async (req, res, next) => {
  try {
    if (!req.apiKey?.userId || req.apiKey.userId === "dev") {
      return res.status(401).json({
        error: { code: "no_user", message: "API key must be associated with a registered account." },
      });
    }
    const input = createSchema.parse(req.body || {});
    const channelMap = { email: "EMAIL", slack: "SLACK", dashboard: "DASHBOARD" };
    const expiresAt = new Date(Date.now() + parseExpiry(input.expires_in));
    const token = generateApprovalToken(randomUUID().replaceAll("-", ""));
    const agentName = input.agent_name || req.apiKey.keyPrefix || "agent";

    const approval = await req.prisma.approval.create({
      data: {
        userId: req.apiKey.userId, apiKeyId: req.apiKey.id !== "dev" ? req.apiKey.id : null,
        agentName, action: input.action, summary: input.summary, details: input.details || {},
        status: "PENDING", channel: channelMap[input.channel] || "EMAIL", recipient: input.recipient,
        expiresAt, webhookUrl: input.webhook_url || null, approvalToken: token,
      },
    });
    await req.prisma.approvalLog.create({ data: { approvalId: approval.id, event: "created", metadata: { agentName, action: input.action } } });

    if (approval.channel === "EMAIL") {
      const result = await sendApprovalEmail({ approval });
      await req.prisma.approvalLog.create({ data: { approvalId: approval.id, event: result.success ? "delivered" : "delivery_failed", metadata: result.success ? { emailId: result.emailId } : { error: result.error } } });
    }

    return res.status(201).json({
      id: approval.id, status: "pending", action: approval.action, summary: approval.summary,
      channel: approval.channel.toLowerCase(), recipient: approval.recipient,
      expires_at: approval.expiresAt.toISOString(), created_at: approval.createdAt.toISOString(),
      approve_url: `${appUrl()}/a/${approval.id}/approve?t=${token}`,
      reject_url: `${appUrl()}/a/${approval.id}/reject?t=${token}`,
    });
  } catch (error) {
    if (error.name === "ZodError") return res.status(400).json({ error: { code: "invalid_request", message: error.errors[0]?.message || "Invalid request." } });
    return next(error);
  }
});

/** GET /v1/approvals/:id — Get approval status (agent polls this). */
approvalsRouter.get("/:id", async (req, res, next) => {
  try {
    const approval = await req.prisma.approval.findFirst({ where: { id: req.params.id, userId: req.apiKey?.userId } });
    if (!approval) return res.status(404).json({ error: { code: "not_found", message: "Approval not found." } });

    if (approval.status === "PENDING" && new Date() > approval.expiresAt) {
      await req.prisma.approval.update({ where: { id: approval.id }, data: { status: "EXPIRED" } });
      await req.prisma.approvalLog.create({ data: { approvalId: approval.id, event: "expired", metadata: { auto: true } } });
      void deliverApprovalWebhook({ prisma: req.prisma, userId: req.apiKey.userId, approval: { ...approval, status: "EXPIRED" }, eventType: "approval.expired" });
      approval.status = "EXPIRED";
    }
    return res.json({
      id: approval.id, agent_name: approval.agentName, action: approval.action, summary: approval.summary,
      details: approval.details, status: approval.status.toLowerCase(), channel: approval.channel.toLowerCase(),
      recipient: approval.recipient, decided_by: approval.decidedBy, decided_at: approval.decidedAt?.toISOString() || null,
      rejection_reason: approval.rejectionReason, expires_at: approval.expiresAt.toISOString(),
      created_at: approval.createdAt.toISOString(), updated_at: approval.updatedAt.toISOString(),
    });
  } catch (error) { return next(error); }
});

/** GET /v1/approvals — List approvals (for dashboard). */
approvalsRouter.get("/", async (req, res, next) => {
  try {
    const status = req.query.status;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const approvals = await req.prisma.approval.findMany({
      where: { userId: req.apiKey?.userId, ...(status ? { status: status.toUpperCase() } : {}) },
      orderBy: { createdAt: "desc" }, take: limit,
      select: { id: true, agentName: true, action: true, summary: true, status: true, channel: true, recipient: true, expiresAt: true, decidedAt: true, decidedBy: true, createdAt: true },
    });
    return res.json({
      approvals: approvals.map((a) => ({
        ...a, status: a.status.toLowerCase(), channel: a.channel.toLowerCase(),
        expires_at: a.expiresAt.toISOString(), decided_at: a.decidedAt?.toISOString() || null, created_at: a.createdAt.toISOString(),
      })),
    });
  } catch (error) { return next(error); }
});

/** POST /v1/approvals/:id/approve — Approve via signed token (no login) or API key. */
approvalsRouter.post("/:id/approve", async (req, res, next) => {
  try {
    const approval = await resolveApproval(req);
    if (!approval) return res.status(404).json({ error: { code: "not_found", message: "Approval not found or invalid token." } });
    if (approval.status !== "PENDING") return res.status(409).json({ error: { code: "already_decided", message: `Approval has already been ${approval.status.toLowerCase()}.` } });
    if (new Date() > approval.expiresAt) return res.status(410).json({ error: { code: "expired", message: "This approval has expired." } });

    const decidedBy = req.body?.decided_by || approval.recipient;
    await req.prisma.approval.update({ where: { id: approval.id }, data: { status: "APPROVED", decidedAt: new Date(), decidedBy } });
    await req.prisma.approvalLog.create({ data: { approvalId: approval.id, event: "approved", metadata: { decidedBy } } });
    void deliverApprovalWebhook({ prisma: req.prisma, userId: approval.userId, approval: { ...approval, status: "APPROVED", decidedBy, decidedAt: new Date() }, eventType: "approval.approved" });

    return res.json({ id: approval.id, status: "approved", decided_by: decidedBy, decided_at: new Date().toISOString() });
  } catch (error) { return next(error); }
});

/** POST /v1/approvals/:id/reject — Reject via signed token (no login) or API key. */
approvalsRouter.post("/:id/reject", async (req, res, next) => {
  try {
    const approval = await resolveApproval(req);
    if (!approval) return res.status(404).json({ error: { code: "not_found", message: "Approval not found or invalid token." } });
    if (approval.status !== "PENDING") return res.status(409).json({ error: { code: "already_decided", message: `Approval has already been ${approval.status.toLowerCase()}.` } });
    if (new Date() > approval.expiresAt) return res.status(410).json({ error: { code: "expired", message: "This approval has expired." } });

    const rejectionReason = req.body?.reason || null;
    const decidedBy = req.body?.decided_by || approval.recipient;
    await req.prisma.approval.update({ where: { id: approval.id }, data: { status: "REJECTED", decidedAt: new Date(), decidedBy, rejectionReason } });
    await req.prisma.approvalLog.create({ data: { approvalId: approval.id, event: "rejected", metadata: { decidedBy, rejectionReason } } });
    void deliverApprovalWebhook({ prisma: req.prisma, userId: approval.userId, approval: { ...approval, status: "REJECTED", decidedBy, decidedAt: new Date(), rejectionReason }, eventType: "approval.rejected" });

    return res.json({ id: approval.id, status: "rejected", decided_by: decidedBy, decided_at: new Date().toISOString(), rejection_reason: rejectionReason });
  } catch (error) { return next(error); }
});

/** POST /v1/approvals/:id/cancel — Agent cancels a pending approval. */
approvalsRouter.post("/:id/cancel", async (req, res, next) => {
  try {
    const approval = await req.prisma.approval.findFirst({ where: { id: req.params.id, userId: req.apiKey?.userId } });
    if (!approval) return res.status(404).json({ error: { code: "not_found", message: "Approval not found." } });
    if (approval.status !== "PENDING") return res.status(409).json({ error: { code: "already_decided", message: `Approval has already been ${approval.status.toLowerCase()}.` } });
    await req.prisma.approval.update({ where: { id: approval.id }, data: { status: "CANCELLED" } });
    await req.prisma.approvalLog.create({ data: { approvalId: approval.id, event: "cancelled" } });
    return res.json({ id: approval.id, status: "cancelled" });
  } catch (error) { return next(error); }
});

/** GET /v1/approvals/:id/logs — Audit trail for an approval. */
approvalsRouter.get("/:id/logs", async (req, res, next) => {
  try {
    const approval = await req.prisma.approval.findFirst({ where: { id: req.params.id, userId: req.apiKey?.userId } });
    if (!approval) return res.status(404).json({ error: { code: "not_found", message: "Approval not found." } });
    const logs = await req.prisma.approvalLog.findMany({ where: { approvalId: approval.id }, orderBy: { createdAt: "asc" } });
    return res.json({ approval_id: approval.id, logs: logs.map((l) => ({ id: l.id, event: l.event, metadata: l.metadata, created_at: l.createdAt.toISOString() })) });
  } catch (error) { return next(error); }
});

/** Resolves an approval by signed token (no login, from email link) or by API key. */
async function resolveApproval(req) {
  const { id } = req.params;
  const token = req.query.t || req.body?.token;
  if (token) {
    const tokenId = verifyApprovalToken(token);
    if (tokenId) return req.prisma.approval.findUnique({ where: { id } });
  }
  if (req.apiKey?.userId) return req.prisma.approval.findFirst({ where: { id, userId: req.apiKey.userId } });
  return null;
}