import jwt from "jsonwebtoken";

const DEFAULT_SECRET = "agent-approvals-dev-secret-change-me";

export function sessionSecret() {
  return process.env.SESSION_SECRET || DEFAULT_SECRET;
}

export function signSession(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, plan: user.plan },
    sessionSecret(),
    { expiresIn: "7d" },
  );
}

export function verifySessionToken(token) {
  try {
    return jwt.verify(token, sessionSecret());
  } catch {
    return null;
  }
}