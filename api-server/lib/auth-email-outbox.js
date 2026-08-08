import { decryptSecret } from "./secret-box.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "./email.js";

const MAX_ATTEMPTS = 5;
const WORKER_INTERVAL_MS = 5_000;
let workerTimer = null;
let workerRunning = false;

export async function drainAuthEmailOutbox({ prisma, limit = 20, send = sendAuthCodeEmail }) {
  if (!prisma?.authEmailDelivery) return { processed: 0 };

  const now = new Date();
  const candidates = await prisma.authEmailDelivery.findMany({
    where: {
      status: { in: ["pending", "failed", "processing"] },
      attempts: { lt: MAX_ATTEMPTS },
      nextAttemptAt: { lte: now },
    },
    include: { authCode: true },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let processed = 0;
  for (const delivery of candidates) {
    const claimed = await prisma.authEmailDelivery.updateMany({
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

    const authCode = prisma.authCode?.findUnique
      ? await prisma.authCode.findUnique({ where: { id: delivery.authCodeId } })
      : delivery.authCode;
    const code = decryptSecret(delivery.codeCiphertext);
    const unusable = !code
      || !authCode
      || authCode.consumedAt
      || authCode.expiresAt <= new Date();
    if (unusable) {
      await prisma.authEmailDelivery.updateMany({
        where: { id: delivery.id, status: "processing" },
        data: {
          status: "discarded",
          codeCiphertext: null,
          error: null,
          lastAttemptAt: new Date(),
        },
      });
      processed += 1;
      continue;
    }

    const attempt = delivery.attempts + 1;
    let result;
    try {
      result = await send({
        type: authCode.type,
        email: delivery.recipient,
        name: delivery.recipientName,
        code,
      });
    } catch (error) {
      result = { success: false, error: error?.message || "Authentication email delivery failed" };
    }

    if (result.success) {
      await prisma.authEmailDelivery.updateMany({
        where: { id: delivery.id, status: "processing" },
        data: {
          status: "delivered",
          attempts: attempt,
          providerMessageId: result.emailId || null,
          error: null,
          codeCiphertext: null,
          lastAttemptAt: new Date(),
          deliveredAt: new Date(),
        },
      });
    } else {
      const finalFailure = attempt >= MAX_ATTEMPTS;
      const retryDelay = Math.min(60 * 60_000, 10_000 * (2 ** (attempt - 1)));
      await prisma.authEmailDelivery.updateMany({
        where: { id: delivery.id, status: "processing" },
        data: {
          status: finalFailure ? "dead_letter" : "failed",
          attempts: attempt,
          error: safeDeliveryError(result.error),
          lastAttemptAt: new Date(),
          nextAttemptAt: new Date(Date.now() + retryDelay),
          deadLetteredAt: finalFailure ? new Date() : null,
          ...(finalFailure ? { codeCiphertext: null } : {}),
        },
      });
    }
    processed += 1;
  }

  return { processed };
}

export function startAuthEmailDeliveryWorker({ prisma }) {
  if (!prisma || workerTimer) return;
  const tick = async () => {
    if (workerRunning) return;
    workerRunning = true;
    try {
      await drainAuthEmailOutbox({ prisma });
    } catch (error) {
      console.error("[Nodsend] Auth email worker failed:", error?.message || error);
    } finally {
      workerRunning = false;
    }
  };

  workerTimer = setInterval(tick, WORKER_INTERVAL_MS);
  workerTimer.unref?.();
  void tick();
}

export function stopAuthEmailDeliveryWorker() {
  if (workerTimer) clearInterval(workerTimer);
  workerTimer = null;
}

async function sendAuthCodeEmail({ type, email, name, code }) {
  if (type === "EMAIL_VERIFICATION") {
    return sendVerificationEmail({ email, name, code });
  }
  if (type === "PASSWORD_RESET") {
    return sendPasswordResetEmail({ email, name, code });
  }
  return { success: false, error: "Unsupported authentication email type" };
}

function safeDeliveryError(error) {
  return String(error || "Authentication email delivery failed")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 500);
}
