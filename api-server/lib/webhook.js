import crypto from "node:crypto";

/**
 * Signs a webhook payload with HMAC-SHA256.
 * Format: t=<unix-timestamp>,v1=<hex-signature>
 * The signature is computed over "<timestamp>.<raw-body>".
 */
function signPayload(secret, timestamp, rawBody) {
  return crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
}

/**
 * Delivers an approval webhook to the agent's configured URL.
 * Signs the payload with HMAC-SHA256 and retries on failure.
 */
export async function deliverApprovalWebhook({ prisma, userId, approval, eventType }) {
  if (!prisma?.webhook || !userId || !approval) return;

  const webhooks = await prisma.webhook.findMany({
    where: { userId, active: true, events: { has: eventType } },
  });

  if (webhooks.length === 0) return;

  const payload = {
    event_id: `evt_${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`,
    event_type: eventType,
    created_at: new Date().toISOString(),
    approval: {
      id: approval.id,
      agent_name: approval.agentName,
      action: approval.action,
      summary: approval.summary,
      status: approval.status,
      decided_by: approval.decidedBy,
      decided_at: approval.decidedAt?.toISOString() || null,
      rejection_reason: approval.rejectionReason,
      expires_at: approval.expiresAt.toISOString(),
      created_at: approval.createdAt.toISOString(),
    },
  };
  const rawBody = JSON.stringify(payload);

  await Promise.allSettled(
    webhooks.map(async (webhook) => {
      const secret = webhook.secret || process.env.WEBHOOK_SIGNING_SECRET || "agent_approvals_dev_secret";
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = signPayload(secret, timestamp, rawBody);

      let status = "failed";
      let statusCode = null;
      let error = null;

      try {
        const response = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Approval-Event": eventType,
            "Approval-Timestamp": timestamp,
            "Approval-Signature": `t=${timestamp},v1=${signature}`,
          },
          body: rawBody,
          signal: AbortSignal.timeout(10000),
        });

        statusCode = response.status;
        status = response.ok ? "delivered" : "failed";

        if (!response.ok) {
          error = `HTTP ${response.status}`;
        }
      } catch (err) {
        error = err.message;
      }

      try {
        await prisma.webhookDelivery.create({
          data: {
            webhookId: webhook.id,
            approvalId: approval.id,
            eventType,
            payload,
            statusCode,
            status,
            error,
            deliveredAt: status === "delivered" ? new Date() : null,
            attempts: 1,
          },
        });
      } catch (logErr) {
        console.warn("[Agent Approvals] Failed to log webhook delivery:", logErr.message);
      }
    }),
  );

  // Log the webhook event in the approval's audit trail
  try {
    await prisma.approvalLog.create({
      data: {
        approvalId: approval.id,
        event: "webhook_sent",
        metadata: { eventType, webhookCount: webhooks.length },
      },
    });
  } catch (logErr) {
    console.warn("[Agent Approvals] Failed to log webhook event:", logErr.message);
  }
}