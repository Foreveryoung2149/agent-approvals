import { enqueueApprovalWebhookEvent } from "./webhook.js";

let expiryTimer = null;
let expiryWorkerRunning = false;

export async function transitionDecision({ prisma, id, tokenHash, decision, reason = null }) {
  const approval = await prisma.approval.findFirst({
    where: { id, approvalToken: tokenHash },
  });
  if (!approval) return { outcome: "not_found" };

  if (approval.status !== "PENDING") {
    return { outcome: "conflict", approval };
  }
  if (approval.expiresAt <= new Date()) {
    const expired = await expireApproval({ prisma, approval });
    return { outcome: "expired", approval: expired || approval };
  }

  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const changed = await tx.approval.updateMany({
      where: {
        id: approval.id,
        approvalToken: tokenHash,
        status: "PENDING",
        expiresAt: { gt: now },
      },
      data: {
        status: decision,
        decidedAt: now,
        decidedBy: approval.recipient,
        rejectionReason: decision === "REJECTED" ? reason : null,
      },
    });
    if (changed.count !== 1) {
      const current = await tx.approval.findUnique({ where: { id: approval.id } });
      return { outcome: "conflict", approval: current };
    }

    const updated = await tx.approval.findUnique({ where: { id: approval.id } });
    const event = decision === "APPROVED" ? "approved" : "rejected";
    await tx.approvalLog.create({
      data: {
        approvalId: approval.id,
        event,
        metadata: {
          decidedBy: approval.recipient,
          ...(reason ? { rejectionReason: reason } : {}),
        },
      },
    });
    await enqueueApprovalWebhookEvent({
      prisma: tx,
      approval: updated,
      eventType: `approval.${event}`,
    });
    return { outcome: event, approval: updated };
  });
}

export async function expireApproval({ prisma, approval }) {
  return prisma.$transaction(async (tx) => {
    const changed = await tx.approval.updateMany({
      where: { id: approval.id, status: "PENDING", expiresAt: { lte: new Date() } },
      data: { status: "EXPIRED" },
    });
    if (changed.count !== 1) {
      return tx.approval.findUnique({ where: { id: approval.id } });
    }

    const updated = await tx.approval.findUnique({ where: { id: approval.id } });
    await tx.approvalLog.create({
      data: { approvalId: approval.id, event: "expired", metadata: { auto: true } },
    });
    await enqueueApprovalWebhookEvent({
      prisma: tx,
      approval: updated,
      eventType: "approval.expired",
    });
    return updated;
  });
}

export async function expireDueApprovals({ prisma, limit = 100 }) {
  const approvals = await prisma.approval.findMany({
    where: { status: "PENDING", expiresAt: { lte: new Date() } },
    orderBy: { expiresAt: "asc" },
    take: limit,
  });
  for (const approval of approvals) {
    await expireApproval({ prisma, approval });
  }
  return approvals.length;
}

export function startApprovalExpiryWorker({ prisma, intervalMs = 30_000 }) {
  if (!prisma || expiryTimer) return;

  const tick = async () => {
    if (expiryWorkerRunning) return;
    expiryWorkerRunning = true;
    try {
      await expireDueApprovals({ prisma });
    } catch (error) {
      console.error("[Nodsend] Approval expiry worker failed:", error?.message || error);
    } finally {
      expiryWorkerRunning = false;
    }
  };

  expiryTimer = setInterval(tick, intervalMs);
  expiryTimer.unref?.();
  void tick();
}

export function stopApprovalExpiryWorker() {
  if (expiryTimer) clearInterval(expiryTimer);
  expiryTimer = null;
}
