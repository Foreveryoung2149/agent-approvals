import crypto from "node:crypto";
import { sessionSecret } from "./session.js";

function encryptionKey() {
  const configured = process.env.TOTP_ENCRYPTION_KEY;
  if (configured) {
    const key = /^[a-f0-9]{64}$/i.test(configured)
      ? Buffer.from(configured, "hex")
      : Buffer.from(configured, "base64url");
    if (key.length !== 32) {
      throw new Error("TOTP_ENCRYPTION_KEY must encode exactly 32 bytes.");
    }
    return key;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("TOTP_ENCRYPTION_KEY is required in production.");
  }

  return crypto.createHash("sha256").update(sessionSecret()).digest();
}

export function encryptSecret(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptSecret(value) {
  if (!value || typeof value !== "string") return null;
  const [version, ivPart, tagPart, ciphertextPart] = value.split(".");
  if (version !== "v1" || !ivPart || !tagPart || !ciphertextPart) return null;

  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      Buffer.from(ivPart, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextPart, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
