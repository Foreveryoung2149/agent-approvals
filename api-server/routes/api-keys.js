import { Router } from "express";
import { z } from "zod";
import { generateApiKey, hashSecret, maskApiKey } from "../lib/tokens.js";
import { sessionAuthMiddleware } from "../middleware/session-auth.js";

export const apiKeysRouter = Router();

// All API key routes require session auth (user logged in via dashboard)
apiKeysRouter.use(sessionAuthMiddleware);

const createKeySchema = z.object({
  name: z.string().min(1).max(100).default("Default key"),
  mode: z.enum(["live", "test"]).default("live"),
});

/** GET /v1/api-keys — List all API keys for the current user. */
apiKeysRouter.get("/", async (req, res, next) => {
  try {
    const keys = await req.prisma.apiKey.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      keys: keys.map((k) => ({
        id: k.id,
        name: k.name,
        key_prefix: maskApiKey(k.keyPrefix),
        plan: k.plan.toLowerCase(),
        last_used_at: k.lastUsedAt?.toISOString() || null,
        revoked: k.revokedAt !== null,
        created_at: k.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return next(error);
  }
});

/** POST /v1/api-keys — Create a new API key. */
apiKeysRouter.post("/", async (req, res, next) => {
  try {
    const input = createKeySchema.parse(req.body || {});
    const key = generateApiKey(input.mode);

    const apiKey = await req.prisma.apiKey.create({
      data: {
        userId: req.user.id,
        name: input.name,
        keyPrefix: key.slice(0, 20),
        keyHash: hashSecret(key),
        plan: req.user.plan,
      },
    });

    return res.status(201).json({
      id: apiKey.id,
      name: apiKey.name,
      key, // Full key shown ONCE — never stored or shown again
      key_prefix: maskApiKey(apiKey.keyPrefix),
      plan: apiKey.plan.toLowerCase(),
      created_at: apiKey.createdAt.toISOString(),
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        error: { code: "invalid_request", message: error.errors[0]?.message || "Invalid request." },
      });
    }
    return next(error);
  }
});

/** DELETE /v1/api-keys/:id — Revoke an API key. */
apiKeysRouter.delete("/:id", async (req, res, next) => {
  try {
    await req.prisma.apiKey.updateMany({
      where: { id: req.params.id, userId: req.user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
});