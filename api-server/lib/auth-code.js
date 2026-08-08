import crypto from "node:crypto";
import { sessionSecret } from "./session.js";

function authCodePepper() {
  const configured = process.env.AUTH_CODE_PEPPER;
  if (configured && configured.length >= 32) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_CODE_PEPPER must be configured with at least 32 characters in production.");
  }
  return sessionSecret();
}

export function hashAuthCode({ code, userId, type }) {
  return crypto
    .createHmac("sha256", authCodePepper())
    .update(`${type}:${userId}:${code}`)
    .digest("hex");
}

export function verifyAuthCode(stored, code) {
  if (!stored?.codeHash || !stored.userId || !stored.type) return false;
  const expected = Buffer.from(hashAuthCode({
    code: String(code),
    userId: stored.userId,
    type: stored.type,
  }), "hex");
  const supplied = Buffer.from(stored.codeHash, "hex");
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}
