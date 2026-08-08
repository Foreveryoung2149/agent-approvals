import { Router } from "express";
import { randomInt, createHash } from "node:crypto";
import { z } from "zod";
import { hashPassword, verifyPassword } from "../middleware/session-auth.js";
import { signSession } from "../lib/session.js";
import { sendPasswordResetEmail } from "../lib/email.js";

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

// In-memory store for password reset codes (simple, production would use Redis/DB)
const resetCodes = new Map(); // key: email, value: { codeHash, expiresAt, attempts }
const RESET_CODE_TTL = 15 * 60 * 1000; // 15 minutes
const MAX_RESET_ATTEMPTS = 5;

function hashCode(code) {
  return createHash("sha256").update(code).digest("hex");
}

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

    const pwHash = await hashPassword(input.password);

    const user = await req.prisma.user.create({
      data: {
        email: input.email,
        passwordHash: pwHash,
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
        twoFactorEnabled: user.twoFactorEnabled,
        created_at: user.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return next(error);
  }
});

/** POST /v1/auth/forgot-password — Request a password reset code. */
authRouter.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({
        error: { code: "invalid_request", message: "Email is required." },
      });
    }

    // Always return ok (don't leak whether email exists)
    const user = await req.prisma?.user?.findUnique({ where: { email: email.toLowerCase() } });

    if (user) {
      // Generate 6-digit code
      const code = String(randomInt(100000, 999999));
      resetCodes.set(email.toLowerCase(), {
        codeHash: hashCode(code),
        expiresAt: Date.now() + RESET_CODE_TTL,
        attempts: 0,
      });

      // Send email (fire and forget)
      sendPasswordResetEmail({ email: user.email, code, name: user.name }).catch((err) => {
        console.error("[Nodsend] Failed to send password reset email:", err);
      });
    }

    return res.json({ ok: true, message: "If an account exists with that email, a reset code has been sent." });
  } catch (error) {
    return next(error);
  }
});

/** POST /v1/auth/reset-password — Reset password with code. */
authRouter.post("/reset-password", async (req, res, next) => {
  try {
    const { email, code, newPassword } = req.body || {};
    if (!email || !code || !newPassword) {
      return res.status(400).json({
        error: { code: "invalid_request", message: "Email, code, and newPassword are required." },
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: { code: "invalid_request", message: "Password must be at least 8 characters." },
      });
    }

    const stored = resetCodes.get(email.toLowerCase());
    if (!stored) {
      return res.status(400).json({
        error: { code: "invalid_code", message: "No reset code found. Please request a new one." },
      });
    }

    if (Date.now() > stored.expiresAt) {
      resetCodes.delete(email.toLowerCase());
      return res.status(400).json({
        error: { code: "code_expired", message: "Reset code has expired. Please request a new one." },
      });
    }

    if (stored.attempts >= MAX_RESET_ATTEMPTS) {
      resetCodes.delete(email.toLowerCase());
      return res.status(429).json({
        error: { code: "too_many_attempts", message: "Too many attempts. Please request a new code." },
      });
    }

    stored.attempts++;

    if (hashCode(code) !== stored.codeHash) {
      return res.status(400).json({
        error: { code: "invalid_code", message: "Invalid reset code." },
      });
    }

    // Code is valid — update password
    const pwHash = await hashPassword(newPassword);
    await req.prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { passwordHash: pwHash },
    });

    // Cleanup
    resetCodes.delete(email.toLowerCase());

    return res.json({ ok: true, message: "Password updated successfully. Please sign in." });
  } catch (error) {
    return next(error);
  }
});