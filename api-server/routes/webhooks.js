import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { sessionAuthMiddleware } from "../middleware/session-auth.js";
import { sendSignedWebhook } from "../lib/webhook.js";
import { assertSafeWebhookUrl } from "../lib/url-security.js";

export const webhooksRouter = Router();

webhooksRouter.use(sessionAuthMiddleware);

const createSchema = z.object({
  url: z.string().url().max(2000),
  events: z.array(z.enum(["approval.created", "approval.approved", "approval.rejected", "approval.expired", "approval.cancelled"])).default(["approval.approved", "approval.rejected", "approval.expired"]),
});

/** GET /v1/webhooks — List all webhooks for the current user. */
webhooksRouter.get("/", async (req, res, next) => {
  try {
    const webhooks = await req.prisma.webhook.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    return res.json({
      webhooks: webhooks.map((w) => ({
        id: w.id, url: w.url, active: w.active, events: w.events, created_at: w.createdAt.toISOString(),
      })),
    });
  } catch (error) { return next(error); }
});

/** POST /v1/webhooks — Create a new webhook. */
webhooksRouter.post("/", async (req, res, next) => {
  try {
    const input = createSchema.parse(req.body || {});
    try {
      await assertSafeWebhookUrl(input.url);
    } catch (error) {
      return res.status(400).json({
        error: { code: "invalid_webhook_url", message: error.message },
      });
    }
    const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`;

    const webhook = await req.prisma.webhook.create({
      data: { userId: req.user.id, url: input.url, secret, events: input.events },
    });

    return res.status(201).json({
      id: webhook.id, url: webhook.url, secret, events: webhook.events,
      active: webhook.active, created_at: webhook.createdAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: { code: "invalid_request", message: error.issues[0]?.message || "Invalid request." } });
    return next(error);
  }
});

/** POST /v1/webhooks/:id/rotate-secret — Rotate signing secret. */
webhooksRouter.post("/:id/rotate-secret", async (req, res, next) => {
  try {
    const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`;
    const updated = await req.prisma.webhook.updateMany({ where: { id: req.params.id, userId: req.user.id }, data: { secret } });
    if (updated.count !== 1) return res.status(404).json({ error: { code: "not_found", message: "Webhook not found." } });
    return res.json({ secret });
  } catch (error) { return next(error); }
});

/** DELETE /v1/webhooks/:id — Delete a webhook. */
webhooksRouter.delete("/:id", async (req, res, next) => {
  try {
    await req.prisma.webhook.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
    return res.status(204).end();
  } catch (error) { return next(error); }
});

/** GET /v1/webhooks/:id/deliveries — View delivery history. */
webhooksRouter.get("/:id/deliveries", async (req, res, next) => {
  try {
    const deliveries = await req.prisma.webhookDelivery.findMany({
      where: { webhookId: req.params.id, webhook: { userId: req.user.id } },
      orderBy: { createdAt: "desc" }, take: 50,
    });
    return res.json({
      deliveries: deliveries.map((d) => ({
        id: d.id, event_type: d.eventType, status: d.status, status_code: d.statusCode,
        error: d.error, attempts: d.attempts,
        delivered_at: d.deliveredAt?.toISOString() || null,
        last_attempt_at: d.lastAttemptAt?.toISOString() || null,
        next_attempt_at: d.nextAttemptAt?.toISOString() || null,
        created_at: d.createdAt.toISOString(),
      })),
    });
  } catch (error) { return next(error); }
});

/** POST /v1/webhooks/:id/test — Send a test webhook. */
webhooksRouter.post("/:id/test", async (req, res, next) => {
  try {
    const webhook = await req.prisma.webhook.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!webhook) return res.status(404).json({ error: { code: "not_found", message: "Webhook not found." } });

    const payload = {
      event_id: `evt_test_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`,
      event_type: "approval.test",
      created_at: new Date().toISOString(),
      test: true,
    };
    const startedAt = new Date();
    const delivery = await req.prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        approvalId: null,
        eventType: "approval.test",
        payload,
        status: "processing",
        attempts: 0,
        lastAttemptAt: startedAt,
        nextAttemptAt: new Date(startedAt.getTime() + 30_000),
      },
    });
    try {
      const statusCode = await sendSignedWebhook({
        webhook,
        payload,
        eventType: "approval.test",
      });
      const completedAt = new Date();
      await req.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "delivered",
          statusCode,
          error: null,
          attempts: 1,
          lastAttemptAt: completedAt,
          deliveredAt: completedAt,
        },
      });
      return res.json({ delivery_id: delivery.id, status: "delivered", status_code: statusCode });
    } catch (err) {
      const failedAt = new Date();
      await req.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "failed",
          statusCode: null,
          error: String(err?.message || "Test delivery failed").slice(0, 1000),
          attempts: 1,
          lastAttemptAt: failedAt,
          nextAttemptAt: new Date(failedAt.getTime() + 10_000),
        },
      });
      return res.status(502).json({ delivery_id: delivery.id, status: "failed", error: err.message });
    }
  } catch (error) { return next(error); }
});
