import crypto from "node:crypto";

export const PLAN_LIMITS = {
  free: { requestsPerMinute: 20, monthlyApprovals: 100 },
  startup: { requestsPerMinute: 60, monthlyApprovals: 1000 },
  business: { requestsPerMinute: 200, monthlyApprovals: 10000 },
  enterprise: { requestsPerMinute: 1000, monthlyApprovals: null },
};

const fallbackBuckets = new Map();
let cleanupCounter = 0;

export function normalizePlan(plan) {
  const normalized = String(plan || "free").toLowerCase();
  return PLAN_LIMITS[normalized] ? normalized : "free";
}

export async function rateLimiter(req, res, next) {
  const plan = normalizePlan(req.apiKey?.plan);
  return enforceLimit({
    req,
    res,
    next,
    namespace: "api",
    requests: PLAN_LIMITS[plan].requestsPerMinute,
    windowMs: 60_000,
    identity: req.apiKey?.id || req.apiKey?.userId || req.ip,
    message: `Rate limit exceeded for ${plan} plan.`,
  });
}

export const publicDecisionRateLimiter = createFixedWindowLimiter({
  namespace: "decision",
  requests: 30,
  windowMs: 60_000,
  identity: (req) => `${req.ip}:${req.params?.id || req.path}`,
});

export const authRateLimiter = createFixedWindowLimiter({
  namespace: "auth",
  requests: 20,
  windowMs: 15 * 60_000,
  identity: (req) => {
    // Never key 2FA attempts by the challenge token: a fresh password login can
    // mint a new challenge, which would otherwise reset the brute-force budget.
    const subject = req.body?.email || req.path;
    return `${req.ip}:${String(subject).trim().toLowerCase()}`;
  },
});

function createFixedWindowLimiter({ namespace, requests, windowMs, identity = (req) => req.ip }) {
  return async function fixedWindowLimiter(req, res, next) {
    return enforceLimit({
      req,
      res,
      next,
      namespace,
      requests,
      windowMs,
      identity: identity(req),
      message: "Too many requests. Try again later.",
    });
  };
}

async function enforceLimit({ req, res, next, namespace, requests, windowMs, identity, message }) {
  try {
    const result = await consumeRateLimit({
      prisma: req.prisma,
      namespace,
      identity,
      requests,
      windowMs,
    });
    setRateLimitHeaders(res, result);
    if (!result.allowed) {
      res.setHeader("Retry-After", String(Math.max(1, result.resetAt - Math.floor(Date.now() / 1000))));
      return res.status(429).json({
        error: { code: "rate_limited", message },
      });
    }
    return next();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      const result = consumeFallbackBucket({ namespace, identity, requests, windowMs });
      setRateLimitHeaders(res, result);
      if (!result.allowed) {
        res.setHeader("Retry-After", String(Math.max(1, result.resetAt - Math.floor(Date.now() / 1000))));
        return res.status(429).json({
          error: { code: "rate_limited", message },
        });
      }
      return next();
    }

    console.error("[Nodsend] Distributed rate limiter unavailable:", {
      requestId: req.requestId,
      namespace,
      error: error?.message || String(error),
    });
    return res.status(503).json({
      error: {
        code: "rate_limiter_unavailable",
        message: "Request safety controls are temporarily unavailable. Try again shortly.",
      },
    });
  }
}

/**
 * Atomically increments a fixed-window counter in PostgreSQL. The persisted key
 * is a SHA-256 digest so potentially sensitive principals never reach storage.
 */
export async function consumeRateLimit({
  prisma,
  namespace,
  identity,
  requests,
  windowMs,
  now = new Date(),
}) {
  if (!prisma?.$queryRaw) throw new Error("PostgreSQL rate-limit storage is unavailable.");
  const nowMs = now.getTime();
  const windowStartMs = Math.floor(nowMs / windowMs) * windowMs;
  const windowStart = new Date(windowStartMs);
  const windowEndMs = windowStartMs + windowMs;
  const expiresAt = new Date(windowEndMs + Math.max(60 * 60_000, windowMs * 2));
  const key = crypto
    .createHash("sha256")
    .update(`${namespace}:${String(identity || "anonymous")}:${windowStartMs}`)
    .digest("hex");

  const rows = await prisma.$queryRaw`
    INSERT INTO "RateLimitBucket" ("key", "count", "windowStart", "expiresAt", "updatedAt")
    VALUES (${key}, 1, ${windowStart}, ${expiresAt}, ${now})
    ON CONFLICT ("key") DO UPDATE
      SET "count" = "RateLimitBucket"."count" + 1,
          "expiresAt" = EXCLUDED."expiresAt",
          "updatedAt" = EXCLUDED."updatedAt"
    RETURNING "count"
  `;
  const count = Number(rows[0]?.count || 0);
  if (!Number.isSafeInteger(count) || count < 1) {
    throw new Error("PostgreSQL rate-limit counter returned an invalid result.");
  }

  cleanupCounter += 1;
  if (cleanupCounter % 1000 === 0 && prisma.rateLimitBucket?.deleteMany) {
    void prisma.rateLimitBucket.deleteMany({
      where: { expiresAt: { lt: now } },
    }).catch((error) => {
      console.warn("[Nodsend] Rate-limit cleanup failed:", error?.message || error);
    });
  }

  return {
    allowed: count <= requests,
    limit: requests,
    remaining: Math.max(0, requests - count),
    resetAt: Math.ceil(windowEndMs / 1000),
    count,
  };
}

function consumeFallbackBucket({ namespace, identity, requests, windowMs }) {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const key = `${namespace}:${identity}:${windowStart}`;
  const count = (fallbackBuckets.get(key) || 0) + 1;
  fallbackBuckets.set(key, count);

  if (fallbackBuckets.size > 10_000) {
    for (const candidate of fallbackBuckets.keys()) {
      const candidateWindow = Number(candidate.slice(candidate.lastIndexOf(":") + 1));
      if (candidateWindow + windowMs < now) fallbackBuckets.delete(candidate);
    }
  }

  return {
    allowed: count <= requests,
    limit: requests,
    remaining: Math.max(0, requests - count),
    resetAt: Math.ceil((windowStart + windowMs) / 1000),
    count,
  };
}

function setRateLimitHeaders(res, { limit, remaining, resetAt }) {
  res.setHeader("RateLimit-Limit", String(limit));
  res.setHeader("RateLimit-Remaining", String(remaining));
  res.setHeader("RateLimit-Reset", String(resetAt));
  res.setHeader("X-RateLimit-Limit", String(limit));
  res.setHeader("X-RateLimit-Remaining", String(remaining));
  res.setHeader("X-RateLimit-Reset", String(resetAt));
}
