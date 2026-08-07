export const PLAN_LIMITS = {
  free: { requestsPerMinute: 20, monthlyApprovals: 100 },
  startup: { requestsPerMinute: 60, monthlyApprovals: 1000 },
  business: { requestsPerMinute: 200, monthlyApprovals: 10000 },
  enterprise: { requestsPerMinute: 1000, monthlyApprovals: null },
};

const buckets = new Map();

function monthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function rateLimiter(req, res, next) {
  const plan = req.apiKey?.plan || "free";
  const limit = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const bucketKey = req.apiKey?.id || req.ip;
  const now = Date.now();
  const windowMs = 60 * 1000;
  const bucket = buckets.get(bucketKey) || { count: 0, resetAt: now + windowMs };

  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }

  bucket.count += 1;
  buckets.set(bucketKey, bucket);

  res.setHeader("X-RateLimit-Limit", String(limit.requestsPerMinute));
  res.setHeader("X-RateLimit-Remaining", String(Math.max(0, limit.requestsPerMinute - bucket.count)));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

  if (bucket.count > limit.requestsPerMinute) {
    return res.status(429).json({
      error: {
        code: "rate_limited",
        message: `Rate limit exceeded for ${plan} plan.`,
      },
    });
  }

  // Monthly approval quota
  if (limit.monthlyApprovals !== null && req.prisma?.approval && req.apiKey?.userId && req.apiKey.userId !== "dev") {
    try {
      const usedThisMonth = await req.prisma.approval.count({
        where: {
          userId: req.apiKey.userId,
          createdAt: { gte: monthStart() },
        },
      });

      res.setHeader("X-Monthly-Limit", String(limit.monthlyApprovals));
      res.setHeader("X-Monthly-Used", String(usedThisMonth));
      res.setHeader("X-Monthly-Remaining", String(Math.max(0, limit.monthlyApprovals - usedThisMonth)));

      if (usedThisMonth >= limit.monthlyApprovals) {
        return res.status(402).json({
          error: {
            code: "monthly_quota_exceeded",
            message: `Monthly approval quota exceeded for ${plan} plan.`,
          },
        });
      }
    } catch (error) {
      console.warn("[Agent Approvals] Failed to enforce monthly quota:", error.message);
    }
  }

  return next();
}