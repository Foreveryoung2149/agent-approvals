import { Router } from "express";
import { z } from "zod";
import { hashPassword, verifyPassword } from "../middleware/session-auth.js";
import { signSession } from "../lib/session.js";

export const authRouter = Router();

const signupSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().max(200).optional(),
});

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

/** POST /v1/auth/signup — Create a new account. */
authRouter.post("/signup", async (req, res, next) => {
  try {
    if (!req.prisma?.user) {
      return res.status(503).json({
        error: { code: "database_required", message: "Set DATABASE_URL and run Prisma migrations before using accounts." },
      });
    }

    const input = signupSchema.parse(req.body || {});

    // Check if user already exists
    const existing = await req.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      return res.status(409).json({
        error: { code: "email_taken", message: "An account with this email already exists." },
      });
    }

    const passwordHash = await hashPassword(input.password);

    const user = await req.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name || null,
        emailVerified: true, // Auto-verify for MVP (add email verification later)
      },
    });

    const token = signSession(user);

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan.toLowerCase(),
      },
      token,
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

/** POST /v1/auth/login — Log in with email and password. */
authRouter.post("/login", async (req, res, next) => {
  try {
    if (!req.prisma?.user) {
      return res.status(503).json({
        error: { code: "database_required", message: "Database is not configured." },
      });
    }

    const input = loginSchema.parse(req.body || {});

    const user = await req.prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      return res.status(401).json({
        error: { code: "invalid_credentials", message: "Invalid email or password." },
      });
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({
        error: { code: "invalid_credentials", message: "Invalid email or password." },
      });
    }

    const token = signSession(user);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan.toLowerCase(),
      },
      token,
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

/** GET /v1/auth/me — Get current user (requires session token). */
authRouter.get("/me", async (req, res, next) => {
  try {
    const { verifySessionToken } = await import("../lib/session.js");
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({
        error: { code: "unauthorized", message: "Missing session token." },
      });
    }

    const session = verifySessionToken(token);
    if (!session) {
      return res.status(401).json({
        error: { code: "invalid_session", message: "Invalid or expired session." },
      });
    }

    const user = await req.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      return res.status(404).json({
        error: { code: "user_not_found", message: "User not found." },
      });
    }

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan.toLowerCase(),
        email_verified: user.emailVerified,
        created_at: user.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return next(error);
  }
});