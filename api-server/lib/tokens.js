import crypto from "node:crypto";

/**
 * Generates a high-entropy, opaque decision token. Only its SHA-256 digest is
 * persisted. The raw token is delivered to the human approver and is never
 * returned to the requesting agent.
 */
export function generateApprovalToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashApprovalToken(token) {
  if (!token || typeof token !== "string") return null;
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * One-way migration for links issued by the pre-v1 prototype, which stored the
 * raw signed token. Existing links continue to work because reviewers still
 * present that raw value and all lookups now compare its SHA-256 digest.
 */
export async function migrateLegacyApprovalTokens({ prisma, batchSize = 250 }) {
  let cursor = null;
  let migrated = 0;

  for (;;) {
    const approvals = await prisma.approval.findMany({
      orderBy: { id: "asc" },
      take: batchSize,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, approvalToken: true },
    });
    if (approvals.length === 0) break;

    for (const approval of approvals) {
      if (!/^[a-f0-9]{64}$/i.test(approval.approvalToken)) {
        const updated = await prisma.approval.updateMany({
          where: { id: approval.id, approvalToken: approval.approvalToken },
          data: { approvalToken: hashApprovalToken(approval.approvalToken) },
        });
        migrated += updated.count;
      }
    }

    cursor = approvals.at(-1).id;
    if (approvals.length < batchSize) break;
  }

  return migrated;
}

/**
 * Generates an API key with a recognizable prefix.
 * Format: appr_live_<random> or appr_test_<random>
 */
export function generateApiKey(mode = "live") {
  const token = crypto.randomBytes(24).toString("base64url");
  return `appr_${mode}_${token}`;
}

/**
 * Hashes an API key for storage. The full key is never stored —
 * only the hash and a prefix for identification.
 */
export function hashSecret(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function maskApiKey(prefix) {
  return `${prefix}...`;
}
