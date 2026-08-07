import crypto from "node:crypto";

const SECRET = process.env.APPROVAL_TOKEN_SECRET || crypto.randomBytes(32).toString("hex");

/**
 * Generates a signed token for an approval's approve/reject links.
 * The token is embedded in the URL so the human doesn't need to log in.
 * Format: <random-id>.<hmac-signature>
 */
export function generateApprovalToken(approvalId) {
  const random = crypto.randomBytes(16).toString("hex");
  const payload = `${approvalId}.${random}`;
  const signature = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

/**
 * Verifies a signed approval token from an approve/reject URL.
 * Returns the approval ID if valid, null if tampered or malformed.
 */
export function verifyApprovalToken(token) {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [approvalId, random, signature] = parts;
  const payload = `${approvalId}.${random}`;
  const expectedSignature = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");

  if (signature !== expectedSignature) return null;

  return approvalId;
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