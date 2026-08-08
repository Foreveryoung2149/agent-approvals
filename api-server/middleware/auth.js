import { hashSecret } from "../lib/tokens.js";
import { verifySessionToken } from "../lib/session.js";
import { readSessionToken } from "../lib/session-cookie.js";

const DEV_KEY = process.env.DEV_API_KEY || "appr_dev_devkey";

/**
 * API key authentication middleware.
 * Reads the Authorization: Bearer <key> header, hashes it, and looks up
 * the matching ApiKey in the database. Attaches req.apiKey with the
 * user's plan, ID, and email.
 */
export async function authMiddleware(req, res, next) {
  const token = readSessionToken(req);

  if (!token) {
    return res.status(401).json({
      error: { code: "unauthorized", message: "Provide an agent API key or authenticated dashboard session." },
    });
  }

  // Explicit local-development bypass. Production startup rejects
  // API_AUTH_DISABLED and never accepts the source-code fallback key.
  if (
    process.env.NODE_ENV !== "production"
    && (process.env.API_AUTH_DISABLED === "true" || token === DEV_KEY)
  ) {
    req.apiKey = {
      id: "dev",
      keyPrefix: token.slice(0, 12),
      userId: null,
      plan: "enterprise",
      userEmail: "dev@local",
      principalType: "development",
    };
    return next();
  }

  if (!req.prisma?.apiKey) {
    return res.status(503).json({
      error: { code: "database_required", message: "Database is not configured." },
    });
  }

  try {
    if (!token.startsWith("appr_")) {
      return authenticateDashboardSession(req, res, next, token);
    }

    const key = await req.prisma.apiKey.findFirst({
      where: { keyHash: hashSecret(token), revokedAt: null },
      include: { user: true },
    });

    if (!key) {
      return res.status(401).json({
        error: { code: "invalid_key", message: "Invalid or revoked API key." },
      });
    }

    if (!key.user.emailVerified) {
      return res.status(403).json({
        error: { code: "email_unverified", message: "Verify the account email before using API keys." },
      });
    }

    req.apiKey = {
      id: key.id,
      keyPrefix: key.keyPrefix,
      userId: key.userId,
      plan: key.user.plan.toLowerCase(),
      userEmail: key.user.email,
      principalType: "api_key",
    };

    // Update last used timestamp (fire and forget)
    req.prisma.apiKey
      .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});

    return next();
  } catch (error) {
    return res.status(500).json({
      error: { code: "auth_error", message: "Failed to authenticate API key." },
    });
  }
}

async function authenticateDashboardSession(req, res, next, token) {
  const session = verifySessionToken(token);
  if (!session) {
    return res.status(401).json({
      error: { code: "invalid_key", message: "Invalid API key or dashboard session." },
    });
  }

  const user = await req.prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || (session.sessionVersion || 0) !== (user.sessionVersion || 0)) {
    return res.status(401).json({
      error: { code: "invalid_session", message: "Invalid or revoked dashboard session." },
    });
  }

  req.user = user;
  req.apiKey = {
    id: null,
    keyPrefix: "dashboard",
    userId: user.id,
    plan: user.plan.toLowerCase(),
    userEmail: user.email,
    principalType: "session",
  };
  return next();
}
