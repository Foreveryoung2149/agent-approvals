import { Router } from "express";
import { randomInt } from "node:crypto";
import { z } from "zod";
import { hashPassword, verifyPassword } from "../middleware/session-auth.js";
import {
  signSession,
  signTwoFactorChallenge,
  verifyTwoFactorChallenge,
} from "../lib/session.js";
import { decryptSecret, encryptSecret } from "../lib/secret-box.js";
import {
  clearSessionCookie,
  readSessionToken,
  setSessionCookie,
} from "../lib/session-cookie.js";
import { hashAuthCode, verifyAuthCode } from "../lib/auth-code.js";
import { generateSecret, generateURI, verifySync } from "otplib";

export const authRouter = Router();

const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(12, "Password must contain at least 12 characters.").max(128),
  name: z.string().trim().max(200).optional(),
}).strict();

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1).max(128),
}).strict();

const twoFactorLoginSchema = z.object({
  challengeToken: z.string().min(32).max(2000),
  code: z.string().regex(/^\d{6}$/),
}).strict();

const RESET_CODE_TTL = 15 * 60 * 1000; // 15 minutes
const MAX_RESET_ATTEMPTS = 5;
const DUMMY_PASSWORD_HASH = "$2b$10$7/g/.U9K8vr/P1buHh8bmu6PB81PeF9XSkszFSBwNmwTIASDWquC6";

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
        emailVerified: false,
      },
    });

    // Generate 6-digit verification code
    const code = String(randomInt(100000, 999999));
    await createAuthCode(req.prisma, user, "EMAIL_VERIFICATION", code);

    // Don't return session token yet, return requirement for verification
    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      requireVerification: true
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: { code: "invalid_request", message: error.issues[0]?.message || "Invalid request." },
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
    const valid = await verifyPassword(input.password, user?.passwordHash || DUMMY_PASSWORD_HASH);
    if (!user || !valid) {
      return res.status(401).json({
        error: { code: "invalid_credentials", message: "Invalid email or password." },
      });
    }

    if (!user.emailVerified) {
      return res.status(403).json({
        error: { code: "email_unverified", message: "Verify your email before signing in." },
      });
    }

    if (user.twoFactorEnabled) {
      return res.json({
        requireTwoFactor: true,
        challengeToken: signTwoFactorChallenge(user),
      });
    }

    const token = signSession(user);
    setSessionCookie(res, token);

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
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: { code: "invalid_request", message: error.issues[0]?.message || "Invalid request." },
      });
    }
    return next(error);
  }
});

/** GET /v1/auth/me — Get current user (requires session token). */
authRouter.get("/me", async (req, res, next) => {
  try {
    const { verifySessionToken } = await import("../lib/session.js");
    const token = readSessionToken(req);

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
    if (!user || (session.sessionVersion || 0) !== (user.sessionVersion || 0)) {
      return res.status(401).json({
        error: { code: "invalid_session", message: "Session is no longer valid." },
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

/** POST /v1/auth/verify-email — Verify email with 6-digit code. */
authRouter.post("/verify-email", async (req, res, next) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !code) {
      return res.status(400).json({
        error: { code: "invalid_request", message: "Email and code are required." },
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const stored = await latestAuthCode(req.prisma, normalizedEmail, "EMAIL_VERIFICATION");
    if (!stored) {
      return res.status(400).json({
        error: { code: "invalid_code", message: "No verification code found. Please request a new one." },
      });
    }

    if (new Date() > stored.expiresAt) {
      await consumeAuthCode(req.prisma, stored.id);
      return res.status(400).json({
        error: { code: "code_expired", message: "Verification code has expired. Please request a new one." },
      });
    }

    if (stored.attempts >= MAX_RESET_ATTEMPTS) {
      await consumeAuthCode(req.prisma, stored.id);
      return res.status(429).json({
        error: { code: "too_many_attempts", message: "Too many attempts. Please request a new code." },
      });
    }

    if (!verifyAuthCode(stored, code)) {
      await recordFailedAuthCodeAttempt(req.prisma, stored.id);
      return res.status(400).json({
        error: { code: "invalid_code", message: "Invalid verification code." },
      });
    }

    // Code is valid
    const user = await req.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(404).json({ error: { code: "user_not_found", message: "User not found." } });
    }

    const verifiedUser = await req.prisma.$transaction(async (tx) => {
      const claimed = await claimAuthCode(tx, stored.id);
      if (!claimed) return null;
      const updated = await tx.user.update({
        where: { email: user.email },
        data: { emailVerified: true },
      });
      return updated;
    });
    if (!verifiedUser) {
      return res.status(400).json({
        error: { code: "invalid_code", message: "Verification code was already used or expired." },
      });
    }

    const token = signSession(verifiedUser);
    setSessionCookie(res, token);

    return res.json({
      user: publicUser(verifiedUser),
      token,
    });
  } catch (error) {
    return next(error);
  }
});

/** POST /v1/auth/resend-verification — Resend verification email. */
authRouter.post("/resend-verification", async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({
        error: { code: "invalid_request", message: "Email is required." },
      });
    }

    const user = await req.prisma?.user?.findUnique({ where: { email: email.toLowerCase() } });
    if (user && !user.emailVerified) {
      const code = String(randomInt(100000, 999999));
      await createAuthCode(req.prisma, user, "EMAIL_VERIFICATION", code);

    }

    return res.json({ ok: true, message: "If an unverified account exists, a new code has been sent." });
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
      await createAuthCode(req.prisma, user, "PASSWORD_RESET", code);

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

    if (newPassword.length < 12 || newPassword.length > 128) {
      return res.status(400).json({
        error: { code: "invalid_request", message: "Password must be between 12 and 128 characters." },
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const stored = await latestAuthCode(req.prisma, normalizedEmail, "PASSWORD_RESET");
    if (!stored) {
      return res.status(400).json({
        error: { code: "invalid_code", message: "No reset code found. Please request a new one." },
      });
    }

    if (new Date() > stored.expiresAt) {
      await consumeAuthCode(req.prisma, stored.id);
      return res.status(400).json({
        error: { code: "code_expired", message: "Reset code has expired. Please request a new one." },
      });
    }

    if (stored.attempts >= MAX_RESET_ATTEMPTS) {
      await consumeAuthCode(req.prisma, stored.id);
      return res.status(429).json({
        error: { code: "too_many_attempts", message: "Too many attempts. Please request a new code." },
      });
    }

    if (!verifyAuthCode(stored, code)) {
      await recordFailedAuthCodeAttempt(req.prisma, stored.id);
      return res.status(400).json({
        error: { code: "invalid_code", message: "Invalid reset code." },
      });
    }

    // Code is valid — update password
    const pwHash = await hashPassword(newPassword);
    const passwordUpdated = await req.prisma.$transaction(async (tx) => {
      const claimed = await claimAuthCode(tx, stored.id);
      if (!claimed) return false;
      await tx.user.update({
        where: { email: normalizedEmail },
        data: { passwordHash: pwHash, sessionVersion: { increment: 1 } },
      });
      return true;
    });
    if (!passwordUpdated) {
      return res.status(400).json({
        error: { code: "invalid_code", message: "Reset code was already used or expired." },
      });
    }

    clearSessionCookie(res);
    return res.json({ ok: true, message: "Password updated successfully. Please sign in." });
  } catch (error) {
    return next(error);
  }
});

/** POST /v1/auth/2fa/generate — Generate a new 2FA secret (requires auth). */
authRouter.post("/2fa/generate", async (req, res, next) => {
  try {
    const { verifySessionToken } = await import("../lib/session.js");
    const token = readSessionToken(req);

    if (!token) {
      return res.status(401).json({ error: { code: "unauthorized", message: "Missing session token." } });
    }

    const session = verifySessionToken(token);
    if (!session) {
      return res.status(401).json({ error: { code: "invalid_session", message: "Invalid session." } });
    }

    const user = await req.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || (session.sessionVersion || 0) !== (user.sessionVersion || 0)) {
      return res.status(404).json({ error: { code: "user_not_found", message: "User not found." } });
    }

    const secret = generateSecret();
    const uri = generateURI({ secret, label: user.email, issuer: "Nodsend" });
    await req.prisma.user.update({
      where: { id: user.id },
      data: { twoFactorPendingSecret: encryptSecret(secret) },
    });

    return res.json({
      secret,
      uri
    });
  } catch (error) {
    return next(error);
  }
});

/** POST /v1/auth/2fa/enable — Verify and enable 2FA (requires auth). */
authRouter.post("/2fa/enable", async (req, res, next) => {
  try {
    const { verifySessionToken } = await import("../lib/session.js");
    const token = readSessionToken(req);
    const { code } = req.body || {};

    if (!token) return res.status(401).json({ error: { code: "unauthorized" } });
    if (!/^\d{6}$/.test(String(code || ""))) {
      return res.status(400).json({ error: { code: "invalid_request", message: "A 6-digit code is required." } });
    }

    const session = verifySessionToken(token);
    if (!session) return res.status(401).json({ error: { code: "invalid_session" } });

    const user = await req.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || (session.sessionVersion || 0) !== (user.sessionVersion || 0)) {
      return res.status(401).json({ error: { code: "invalid_session" } });
    }
    const secret = decryptSecret(user.twoFactorPendingSecret);
    if (!secret) {
      return res.status(400).json({
        error: { code: "setup_expired", message: "Generate a new two-factor setup before enabling it." },
      });
    }
    const result = verifySync({ token: code, secret });
    if (!result || !result.valid) {
      return res.status(400).json({ error: { code: "invalid_code", message: "Invalid verification code." } });
    }

    const updatedUser = await req.prisma.user.update({
      where: { id: session.userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: encryptSecret(secret),
        twoFactorPendingSecret: null,
        sessionVersion: { increment: 1 },
      }
    });

    const replacementToken = signSession(updatedUser);
    setSessionCookie(res, replacementToken);
    return res.json({ ok: true, token: replacementToken });
  } catch (error) {
    return next(error);
  }
});

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan.toLowerCase(),
  };
}

async function createAuthCode(prisma, user, type, code) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const outstanding = await tx.authCode.findMany({
          where: { userId: user.id, type, consumedAt: null },
          select: { id: true },
        });
        const outstandingIds = outstanding.map(({ id }) => id);
        if (outstandingIds.length > 0) {
          await tx.authEmailDelivery.updateMany({
            where: {
              authCodeId: { in: outstandingIds },
              status: { in: ["pending", "processing", "failed"] },
            },
            data: { status: "discarded", codeCiphertext: null, error: null },
          });
          await tx.authCode.updateMany({
            where: { id: { in: outstandingIds }, consumedAt: null },
            data: { consumedAt: new Date() },
          });
        }

        const authCode = await tx.authCode.create({
          data: {
            userId: user.id,
            email: user.email.toLowerCase(),
            type,
            codeHash: hashAuthCode({ code, userId: user.id, type }),
            expiresAt: new Date(Date.now() + RESET_CODE_TTL),
          },
        });
        await tx.authEmailDelivery.create({
          data: {
            authCodeId: authCode.id,
            recipient: user.email.toLowerCase(),
            recipientName: user.name || null,
            codeCiphertext: encryptSecret(code),
          },
        });
        return authCode;
      }, { isolationLevel: "Serializable" });
    } catch (error) {
      if (error?.code === "P2034" && attempt < 2) continue;
      throw error;
    }
  }
  throw new Error("Could not create an authentication code. Try again.");
}

function latestAuthCode(prisma, email, type) {
  return prisma.authCode.findFirst({
    where: { email, type, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

function consumeAuthCode(prisma, id) {
  return prisma.authCode.update({ where: { id }, data: { consumedAt: new Date() } });
}

function recordFailedAuthCodeAttempt(prisma, id) {
  return prisma.authCode.updateMany({
    where: { id, consumedAt: null, attempts: { lt: MAX_RESET_ATTEMPTS } },
    data: { attempts: { increment: 1 } },
  });
}

async function claimAuthCode(prisma, id) {
  const claimed = await prisma.authCode.updateMany({
    where: {
      id,
      consumedAt: null,
      attempts: { lt: MAX_RESET_ATTEMPTS },
      expiresAt: { gt: new Date() },
    },
    data: { attempts: { increment: 1 }, consumedAt: new Date() },
  });
  return claimed.count === 1;
}

/** POST /v1/auth/login/2fa — complete a two-factor login challenge. */
authRouter.post("/login/2fa", async (req, res, next) => {
  try {
    const input = twoFactorLoginSchema.parse(req.body || {});
    const challenge = verifyTwoFactorChallenge(input.challengeToken);
    if (!challenge) {
      return res.status(401).json({
        error: { code: "invalid_challenge", message: "Two-factor challenge is invalid or expired." },
      });
    }

    const user = await req.prisma?.user?.findUnique({ where: { id: challenge.userId } });
    if (
      !user
      || !user.twoFactorEnabled
      || (challenge.sessionVersion || 0) !== (user.sessionVersion || 0)
    ) {
      return res.status(401).json({
        error: { code: "invalid_challenge", message: "Two-factor challenge is no longer valid." },
      });
    }

    const secret = decryptSecret(user.twoFactorSecret);
    const result = secret ? verifySync({ token: input.code, secret }) : null;
    if (!result?.valid) {
      return res.status(401).json({
        error: { code: "invalid_two_factor_code", message: "Invalid two-factor code." },
      });
    }

    const token = signSession(user);
    setSessionCookie(res, token);
    return res.json({
      user: publicUser(user),
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: { code: "invalid_request", message: error.issues[0]?.message || "Invalid request." },
      });
    }
    return next(error);
  }
});

/** POST /v1/auth/logout - clear the browser session cookie. */
authRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  return res.status(204).end();
});
