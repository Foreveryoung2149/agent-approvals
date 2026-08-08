import crypto from "node:crypto";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { resolveSafeWebhookUrl } from "./url-security.js";

const MAX_ATTEMPTS = 5;
const WORKER_INTERVAL_MS = 5_000;
let workerTimer = null;
let workerRunning = false;

export function signPayload(secret, eventId, timestamp, rawBody) {
  return crypto.createHmac("sha256", secret).update(`${eventId}.${timestamp}.${rawBody}`).digest("hex");
}

function signLegacyPayload(secret, timestamp, rawBody) {
  return crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
}

export function approvalEventPayload({ approval, eventType }) {
  return {
    event_id: `evt_${crypto.randomUUID().replaceAll("-", "")}`,
    event_type: eventType,
    created_at: new Date().toISOString(),
    data: {
      approval: {
        id: approval.id,
        agent_name: approval.agentName,
        external_id: approval.externalId || null,
        action: approval.action,
        summary: approval.summary,
        details: approval.details || {},
        metadata: approval.metadata || {},
        status: approval.status.toLowerCase(),
        channel: approval.channel.toLowerCase(),
        recipient: approval.recipient,
        decided_by: approval.decidedBy || null,
        decided_at: approval.decidedAt?.toISOString?.() || null,
        rejection_reason: approval.rejectionReason || null,
        expires_at: approval.expiresAt.toISOString(),
        created_at: approval.createdAt.toISOString(),
        updated_at: approval.updatedAt.toISOString(),
      },
    },
  };
}

/**
 * Writes webhook deliveries to the database inside the caller's transaction.
 * The worker performs network I/O only after the business transaction commits.
 */
export async function enqueueApprovalWebhookEvent({ prisma, approval, eventType }) {
  if (!prisma?.webhook || !approval?.userId) return 0;

  const webhooks = await prisma.webhook.findMany({
    where: {
      userId: approval.userId,
      active: true,
      events: { has: eventType },
      ...(approval.webhookId ? { id: approval.webhookId } : {}),
    },
    select: { id: true },
  });
  if (webhooks.length === 0) return 0;

  const payload = approvalEventPayload({ approval, eventType });
  const result = await prisma.webhookDelivery.createMany({
    data: webhooks.map(({ id }) => ({
      webhookId: id,
      approvalId: approval.id,
      eventType,
      payload,
      status: "pending",
      nextAttemptAt: new Date(),
    })),
    skipDuplicates: true,
  });
  return result.count;
}

export async function sendSignedWebhook({ webhook, payload, eventType }) {
  const destination = await resolveSafeWebhookUrl(webhook.url);

  const rawBody = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const eventId = payload.event_id || `evt_${crypto.randomUUID().replaceAll("-", "")}`;
  const signature = signPayload(webhook.secret, eventId, timestamp, rawBody);
  const legacySignature = signLegacyPayload(webhook.secret, timestamp, rawBody);

  return postWebhook({
    destination,
    rawBody,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Nodsend-Webhooks/1.0",
      "Nodsend-Webhook-Id": eventId,
      "Nodsend-Webhook-Event": eventType,
      "Nodsend-Webhook-Timestamp": timestamp,
      "Nodsend-Webhook-Signature": `v1=${signature}`,
      // Temporary compatibility for pre-v1 consumers. New integrations must
      // verify the Nodsend-* signature, which also binds the event ID.
      "Approval-Timestamp": timestamp,
      "Approval-Signature": `v1=${legacySignature}`,
    },
  });
}

function postWebhook({ destination, rawBody, headers }) {
  const { url, addresses } = destination;
  const pinned = addresses[0];
  const transport = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const request = transport.request(url, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Length": Buffer.byteLength(rawBody),
      },
      lookup: (_hostname, _options, callback) => {
        callback(null, pinned.address, pinned.family);
      },
      ...(url.protocol === "https:" && !net.isIP(url.hostname)
        ? { servername: url.hostname }
        : {}),
    }, (response) => {
      response.resume();
      const status = response.statusCode || 0;
      if (status >= 300 && status < 400) {
        reject(new Error("Webhook redirects are not followed."));
      } else if (status < 200 || status >= 300) {
        reject(new Error(`Webhook returned HTTP ${status}.`));
      } else {
        resolve(status);
      }
    });
    request.setTimeout(10_000, () => request.destroy(new Error("Webhook request timed out.")));
    request.on("error", reject);
    request.end(rawBody);
  });
}

export async function drainWebhookOutbox({ prisma, limit = 20 }) {
  if (!prisma?.webhookDelivery) return { processed: 0 };

  const now = new Date();
  const candidates = await prisma.webhookDelivery.findMany({
    where: {
      status: { in: ["pending", "failed", "processing"] },
      attempts: { lt: MAX_ATTEMPTS },
      nextAttemptAt: { lte: now },
    },
    include: { webhook: true },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let processed = 0;
  for (const delivery of candidates) {
    const leaseUntil = new Date(Date.now() + 30_000);
    const claimed = await prisma.webhookDelivery.updateMany({
      where: {
        id: delivery.id,
        status: delivery.status,
        attempts: delivery.attempts,
        nextAttemptAt: { lte: now },
      },
      data: { status: "processing", nextAttemptAt: leaseUntil },
    });
    if (claimed.count !== 1) continue;

    const attempt = delivery.attempts + 1;
    try {
      const statusCode = await sendSignedWebhook({
        webhook: delivery.webhook,
        payload: delivery.payload,
        eventType: delivery.eventType,
      });
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "delivered",
          statusCode,
          error: null,
          attempts: attempt,
          deliveredAt: new Date(),
          lastAttemptAt: new Date(),
        },
      });
      if (delivery.approvalId) {
        await prisma.approvalLog.create({
          data: {
            approvalId: delivery.approvalId,
            event: "webhook_delivered",
            metadata: { deliveryId: delivery.id, eventType: delivery.eventType, attempt },
          },
        });
      }
    } catch (error) {
      const retryDelay = Math.min(60 * 60_000, 10_000 * (2 ** (attempt - 1)));
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "failed",
          statusCode: null,
          error: String(error?.message || "Webhook delivery failed").slice(0, 1000),
          attempts: attempt,
          lastAttemptAt: new Date(),
          nextAttemptAt: new Date(Date.now() + retryDelay),
        },
      });
    }
    processed += 1;
  }

  return { processed };
}

export function startWebhookWorker({ prisma }) {
  if (!prisma || workerTimer) return;

  const tick = async () => {
    if (workerRunning) return;
    workerRunning = true;
    try {
      await drainWebhookOutbox({ prisma });
    } catch (error) {
      console.error("[Nodsend] Webhook worker failed:", error?.message || error);
    } finally {
      workerRunning = false;
    }
  };

  workerTimer = setInterval(tick, WORKER_INTERVAL_MS);
  workerTimer.unref?.();
  void tick();
}

export function stopWebhookWorker() {
  if (workerTimer) clearInterval(workerTimer);
  workerTimer = null;
}
