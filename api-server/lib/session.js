import jwt from "jsonwebtoken";

const DEFAULT_SECRET = "agent-approvals-dev-secret-change-me";
const ISSUER = "nodsend-api";
const AUDIENCE = "nodsend-dashboard";
const TWO_FACTOR_AUDIENCE = "nodsend-login-2fa";

export function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be configured with at least 32 characters in production.");
  }
  return DEFAULT_SECRET;
}

export function signSession(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      plan: user.plan,
      sessionVersion: user.sessionVersion || 0,
    },
    sessionSecret(),
    {
      algorithm: "HS256",
      audience: AUDIENCE,
      issuer: ISSUER,
      expiresIn: "7d",
      jwtid: cryptoRandomId(),
    },
  );
}

export function verifySessionToken(token) {
  try {
    return jwt.verify(token, sessionSecret(), {
      algorithms: ["HS256"],
      audience: AUDIENCE,
      issuer: ISSUER,
    });
  } catch {
    return null;
  }
}

export function signTwoFactorChallenge(user) {
  return jwt.sign(
    {
      userId: user.id,
      sessionVersion: user.sessionVersion || 0,
      purpose: "login-2fa",
    },
    sessionSecret(),
    {
      algorithm: "HS256",
      audience: TWO_FACTOR_AUDIENCE,
      issuer: ISSUER,
      expiresIn: "5m",
      jwtid: cryptoRandomId(),
    },
  );
}

export function verifyTwoFactorChallenge(token) {
  try {
    const payload = jwt.verify(token, sessionSecret(), {
      algorithms: ["HS256"],
      audience: TWO_FACTOR_AUDIENCE,
      issuer: ISSUER,
    });
    return payload?.purpose === "login-2fa" ? payload : null;
  } catch {
    return null;
  }
}

function cryptoRandomId() {
  return globalThis.crypto.randomUUID();
}
