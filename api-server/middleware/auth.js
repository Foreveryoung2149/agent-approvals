import { hashSecret } from "../lib/tokens.js";

const DEV_KEY = process.env.DEV_API_KEY || "appr_dev_devkey";

/**
 * API key authentication middleware.
 * Reads the Authorization: Bearer <key> header, hashes it, and looks up
 * the matching ApiKey in the database. Attaches req.apiKey with the
 * user's plan, ID, and email.
 */
export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      error: { code: "unauthorized", message: "Missing Authorization header. Use: Bearer appr_live_..." },
    });
  }

  // Dev key — bypasses database lookup for local development
  if (process.env.API_AUTH_DISABLED === "true" || token === DEV_KEY) {
    req.apiKey = {
      id: "dev",
      keyPrefix: token.slice(0, 12),
      userId: null,
      plan: "ENTERPRISE",
      userEmail: "dev@local",
    };
    return next();
  }

  if (!req.prisma?.apiKey) {
    return res.status(503).json({
      error: { code: "database_required", message: "Database is not configured." },
    });
  }

  try {
    const key = await req.prisma.apiKey.findFirst({
      where: { keyHash: hashSecret(token), revokedAt: null },
      include: { user: true },
    });

    if (!key) {
      return res.status(401).json({
        error: { code: "invalid_key", message: "Invalid or revoked API key." },
      });
    }

    req.apiKey = {
      id: key.id,
      keyPrefix: key.keyPrefix,
      userId: key.userId,
      plan: key.plan,
      userEmail: key.user.email,
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