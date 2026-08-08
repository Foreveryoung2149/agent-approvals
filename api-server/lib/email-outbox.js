import { decryptSecret } from "./secret-box.js";
import { sendApprovalEmail } from "./email.js";

const MAX_ATTEMPTS = 5;
const WORKER_INTERVAL_MS = 5_000;
let workerTimer = null;
let workerRunning = false;

export async function drainEmailOutbox({ prisma, limit = 20, send = sendApprovalEmail }) {
  if (!prisma?.approvalEmailDelivery) return { processed: 0 };

  const now = new Date();
  const candidates = await prisma.approvalEmailDelivery.findMany({
    where: {
      status: { in: ["pending", "failed", "processing"] },
      attempts: { lt: MAX_ATTEMPTS },
      nextAttemptAt: { lte: now },
    },
    include: { approval: true },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let processed = 0;
  for (const delivery of candidates) {
    const claimed = await prisma.approvalEmailDelivery.updateMany({
      where: {
        id: delivery.id,
        status: delivery.status,
        attempts: delivery.attempts,
        nextAttemptAt: { lte: now },
      },
      data: {
        status: "processing",
        nextAttemptAt: new Date(Date.now() + 30_000),
      },
    });
    if (claimed.count !== 1) continue;

    const attempt = delivery.attempts + 1;
    const approvalToken = decryptSecret(delivery.tokenCiphertext);
    let result;
    try {
      result = approvalToken
        ? await send({ approval: delivery.approval, approvalToken })
        : { success: false, error: "Encrypted decision token is unavailable" };
    } catch (error) {
      result = { success: false, error: error?.message || "Email delivery failed" };
    }

    if (result.success) {
      await prisma.$transaction([
        prisma.approvalEmailDelivery.update({
          where: { id: delivery.id },
          data: {
            status: "delivered",
            attempts: attempt,
            providerMessageId: result.emailId || null,
            error: null,
            tokenCiphertext: null,
            lastAttemptAt: new Date(),
            deliveredAt: new Date(),
          },
        }),
        prisma.approvalLog.create({
          data: {
            approvalId: delivery.approvalId,
            event: "delivered",
            metadata: { emailId: result.emailId || null, attempt },
          },
        }),
      ]);
    } else {
      const finalFailure = attempt >= MAX_ATTEMPTS;
      const retryDelay = Math.min(60 * 60_000, 10_000 * (2 ** (attempt - 1)));
      const operations = [
        prisma.approvalEmailDelivery.update({
          where: { id: delivery.id },
          data: {
            status: "failed",
            attempts: attempt,
            error: String(result.error || "Email delivery failed").slice(0, 1000),
            lastAttemptAt: new Date(),
            nextAttemptAt: new Date(Date.now() + retryDelay),
          },
        }),
      ];
      if (finalFailure) {
        operations.push(prisma.approvalLog.create({
          data: {
            approvalId: delivery.approvalId,
            event: "delivery_failed",
            metadata: { attempts: attempt },
          },
        }));
      }
      await prisma.$transaction(operations);
    }
    processed += 1;
  }

  return { processed };
}

export function startEmailDeliveryWorker({ prisma }) {
  if (!prisma || workerTimer) return;
  const tick = async () => {
    if (workerRunning) return;
    workerRunning = true;
    try {
      await drainEmailOutbox({ prisma });
    } catch (error) {
      console.error("[Nodsend] Email delivery worker failed:", error?.message || error);
    } finally {
      workerRunning = false;
    }
  };

  workerTimer = setInterval(tick, WORKER_INTERVAL_MS);
  workerTimer.unref?.();
  void tick();
}

export function stopEmailDeliveryWorker() {
  if (workerTimer) clearInterval(workerTimer);
  workerTimer = null;
}
