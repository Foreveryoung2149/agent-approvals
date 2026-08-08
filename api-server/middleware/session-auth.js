import bcrypt from "bcryptjs";
import { readSessionToken } from "../lib/session-cookie.js";

/**
 * Session auth middleware — verifies JWT from Authorization header.
 * Used for dashboard routes (not API routes which use API key auth).
 */
export async function sessionAuthMiddleware(req, res, next) {
  const token = readSessionToken(req);

  if (!token) {
    return res.status(401).json({
      error: { code: "unauthorized", message: "Missing session token." },
    });
  }

  const { verifySessionToken } = await import("../lib/session.js");
  const session = verifySessionToken(token);

  if (!session) {
    return res.status(401).json({
      error: { code: "invalid_session", message: "Invalid or expired session token." },
    });
  }

  if (!req.prisma?.user) {
    return res.status(503).json({
      error: { code: "database_required", message: "Database is not configured." },
    });
  }

  try {
    const user = await req.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || (session.sessionVersion || 0) !== (user.sessionVersion || 0)) {
      return res.status(401).json({
        error: { code: "invalid_session", message: "User account was not found or the session was revoked." },
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(500).json({
      error: { code: "auth_error", message: "Failed to verify session." },
    });
  }
}

/**
 * Hashes a password with bcrypt for storage.
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

/**
 * Verifies a password against its hash.
 */
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}
