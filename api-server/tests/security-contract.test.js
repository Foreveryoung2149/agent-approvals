import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import bcrypt from "bcryptjs";
import express from "express";
import { generateSecret, generateSync } from "otplib";

import { transitionDecision } from "../lib/approval-lifecycle.js";
import { hashAuthCode, verifyAuthCode } from "../lib/auth-code.js";
import { drainAuthEmailOutbox } from "../lib/auth-email-outbox.js";
import { drainEmailOutbox } from "../lib/email-outbox.js";
import { decryptSecret, encryptSecret } from "../lib/secret-box.js";
import {
  clearSessionCookie,
  readSessionToken,
  setSessionCookie,
} from "../lib/session-cookie.js";
import {
  signSession,
  signTwoFactorChallenge,
  verifySessionToken,
  verifyTwoFactorChallenge,
} from "../lib/session.js";
import {
  generateApprovalToken,
  hashApprovalToken,
} from "../lib/tokens.js";
import { isPublicAddress } from "../lib/url-security.js";
import { approvalEventPayload, signPayload } from "../lib/webhook.js";
import { consumeRateLimit } from "../middleware/rate-limiter.js";
import {
  approvalsRouter,
  createRequestFingerprint,
  normalizeIdempotencyKey,
} from "../routes/approvals.js";
import { apiKeysRouter } from "../routes/api-keys.js";
import { authRouter } from "../routes/auth.js";
import { webhooksRouter } from "../routes/webhooks.js";

process.env.SESSION_SECRET = "test-session-secret-that-is-at-least-thirty-two-characters";
process.env.TOTP_ENCRYPTION_KEY = "11".repeat(32);
process.env.AUTH_CODE_PEPPER = "test-auth-code-pepper-that-is-at-least-thirty-two-characters";

test("decision tokens are opaque and only their digest is stable", () => {
  const token = generateApprovalToken();
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(token, generateApprovalToken());
  assert.match(hashApprovalToken(token), /^[a-f0-9]{64}$/);
  assert.equal(hashApprovalToken(token), hashApprovalToken(token));
  assert.equal(hashApprovalToken(null), null);
});

test("short-lived auth codes use a tenant-bound keyed digest", () => {
  const stored = {
    userId: "usr_123",
    type: "PASSWORD_RESET",
    codeHash: hashAuthCode({ code: "123456", userId: "usr_123", type: "PASSWORD_RESET" }),
  };
  assert.equal(verifyAuthCode(stored, "123456"), true);
  assert.equal(verifyAuthCode(stored, "654321"), false);
  assert.notEqual(
    stored.codeHash,
    hashAuthCode({ code: "123456", userId: "usr_other", type: "PASSWORD_RESET" }),
  );
  assert.notEqual(stored.codeHash, crypto.createHash("sha256").update("123456").digest("hex"));
});

test("idempotency request fingerprints canonicalize object key order", () => {
  const first = {
    action: "deploy.release",
    details: { region: "lhr", nested: { b: 2, a: 1 } },
    metadata: { run: 42 },
  };
  const reordered = {
    metadata: { run: 42 },
    details: { nested: { a: 1, b: 2 }, region: "lhr" },
    action: "deploy.release",
  };
  assert.equal(createRequestFingerprint(first), createRequestFingerprint(reordered));
  assert.notEqual(
    createRequestFingerprint(first),
    createRequestFingerprint({ ...reordered, action: "deploy.rollback" }),
  );
  assert.equal(normalizeIdempotencyKey("  release-42  ", { required: true }), "release-42");
  assert.throws(
    () => normalizeIdempotencyKey(null, { required: true }),
    (error) => error.code === "missing_idempotency_key",
  );
});

test("webhooks bind event ID, timestamp, and exact raw body", () => {
  const raw = JSON.stringify({ event_id: "evt_123", data: { approval: { id: "apr_123" } } });
  const expected = crypto
    .createHmac("sha256", "whsec_test")
    .update(`evt_123.1786204800.${raw}`)
    .digest("hex");
  assert.equal(signPayload("whsec_test", "evt_123", "1786204800", raw), expected);

  const approval = {
    id: "apr_123",
    userId: "usr_123",
    agentName: "Release agent",
    externalId: "release:42",
    action: "deploy.release",
    summary: "Deploy release 42",
    details: { region: "lhr" },
    metadata: { environment: "production" },
    status: "APPROVED",
    channel: "EMAIL",
    recipient: "reviewer@example.com",
    decidedBy: "reviewer@example.com",
    decidedAt: new Date("2026-08-08T10:01:00.000Z"),
    rejectionReason: null,
    expiresAt: new Date("2026-08-08T11:00:00.000Z"),
    createdAt: new Date("2026-08-08T10:00:00.000Z"),
    updatedAt: new Date("2026-08-08T10:01:00.000Z"),
  };
  const event = approvalEventPayload({ approval, eventType: "approval.approved" });
  assert.equal(event.data.approval.external_id, "release:42");
  assert.deepEqual(event.data.approval.metadata, { environment: "production" });
  assert.equal(event.data.approval.status, "approved");
  assert.equal("approval" in event, false);
});

test("session and two-factor challenge tokens cannot substitute for each other", () => {
  const user = {
    id: "usr_123",
    email: "owner@example.com",
    plan: "BUSINESS",
    sessionVersion: 4,
  };
  const session = signSession(user);
  const challenge = signTwoFactorChallenge(user);
  assert.equal(verifySessionToken(session).userId, user.id);
  assert.equal(verifyTwoFactorChallenge(challenge).userId, user.id);
  assert.equal(verifySessionToken(challenge), null);
  assert.equal(verifyTwoFactorChallenge(session), null);
});

test("two-factor login never creates a session before the TOTP challenge", async () => {
  const secret = generateSecret();
  const user = {
    id: "usr_2fa",
    email: "two-factor@example.com",
    name: "Two Factor",
    plan: "BUSINESS",
    sessionVersion: 2,
    emailVerified: true,
    twoFactorEnabled: true,
    twoFactorSecret: encryptSecret(secret),
    passwordHash: await bcrypt.hash("correct horse battery staple", 4),
  };
  const prisma = {
    user: {
      findUnique: async ({ where }) => (
        where.email === user.email || where.id === user.id ? user : null
      ),
    },
  };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.prisma = prisma; next(); });
  app.use(authRouter);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  try {
    const first = await fetch(`http://127.0.0.1:${port}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, password: "correct horse battery staple" }),
    });
    const challenge = await first.json();
    assert.equal(first.status, 200);
    assert.equal(challenge.requireTwoFactor, true);
    assert.equal(typeof challenge.challengeToken, "string");
    assert.equal("token" in challenge, false);
    assert.equal(first.headers.get("set-cookie"), null);

    const second = await fetch(`http://127.0.0.1:${port}/login/2fa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        challengeToken: challenge.challengeToken,
        code: generateSync({ secret }),
      }),
    });
    const session = await second.json();
    assert.equal(second.status, 200);
    assert.equal(verifySessionToken(session.token).userId, user.id);
    assert.match(second.headers.get("set-cookie"), /^nodsend_session=/);
    assert.match(second.headers.get("set-cookie"), /HttpOnly/);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (
      error ? reject(error) : resolve()
    )));
  }
});

test("browser sessions use HttpOnly SameSite cookies and prefer explicit bearer tokens", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  const headers = new Map();
  const res = { setHeader: (name, value) => headers.set(name, value) };
  setSessionCookie(res, "session-token");
  const cookie = headers.get("Set-Cookie");
  assert.match(cookie, /^nodsend_session=session-token;/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Secure/);
  assert.equal(
    readSessionToken({ headers: { authorization: "Bearer cli-token", cookie } }),
    "cli-token",
  );
  assert.equal(
    readSessionToken({ headers: { cookie: "theme=dark; nodsend_session=cookie-token" } }),
    "cookie-token",
  );
  clearSessionCookie(res);
  assert.match(headers.get("Set-Cookie"), /Max-Age=0/);
  if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousNodeEnv;
});

test("TOTP secrets are authenticated-encrypted at rest", () => {
  const encrypted = encryptSecret("JBSWY3DPEHPK3PXP");
  assert.match(encrypted, /^v1\./);
  assert.equal(encrypted.includes("JBSWY3DPEHPK3PXP"), false);
  assert.equal(decryptSecret(encrypted), "JBSWY3DPEHPK3PXP");
  assert.equal(decryptSecret(`${encrypted}tampered`), null);
  assert.equal(decryptSecret("plaintext-secret"), null);
});

test("approval email delivery is durable and erases the raw token after success", async () => {
  const rawToken = generateApprovalToken();
  const delivery = {
    id: "email_123",
    approvalId: "apr_123",
    status: "pending",
    attempts: 0,
    nextAttemptAt: new Date(0),
    tokenCiphertext: encryptSecret(rawToken),
    createdAt: new Date(0),
    approval: { id: "apr_123", recipient: "reviewer@example.com" },
  };
  let completed;
  let auditLog;
  const prisma = {
    approvalEmailDelivery: {
      findMany: async () => [delivery],
      updateMany: async () => ({ count: 1 }),
      update: async ({ data }) => { completed = data; return data; },
    },
    approvalLog: {
      create: async ({ data }) => { auditLog = data; return data; },
    },
    $transaction: async (operations) => Promise.all(operations),
  };
  let deliveredToken;
  const result = await drainEmailOutbox({
    prisma,
    send: async ({ approvalToken }) => {
      deliveredToken = approvalToken;
      return { success: true, emailId: "resend_123" };
    },
  });

  assert.equal(result.processed, 1);
  assert.equal(deliveredToken, rawToken);
  assert.equal(completed.status, "delivered");
  assert.equal(completed.tokenCiphertext, null);
  assert.equal(auditLog.event, "delivered");
  assert.equal(auditLog.metadata.emailId, "resend_123");
});

test("authentication email delivery decrypts only in the worker and erases the code", async () => {
  const delivery = {
    id: "auth_email_123",
    authCodeId: "auth_code_123",
    recipient: "owner@example.com",
    recipientName: "Owner",
    codeCiphertext: encryptSecret("123456"),
    status: "pending",
    attempts: 0,
    nextAttemptAt: new Date(0),
    createdAt: new Date(0),
    authCode: {
      type: "EMAIL_VERIFICATION",
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    },
  };
  let completed;
  let delivered;
  const prisma = {
    authEmailDelivery: {
      findMany: async () => [delivery],
      updateMany: async ({ data }) => {
        if (data.status !== "processing") completed = data;
        return { count: 1 };
      },
    },
    authCode: { findUnique: async () => delivery.authCode },
  };

  const result = await drainAuthEmailOutbox({
    prisma,
    send: async (message) => {
      delivered = message;
      return { success: true, emailId: "resend_auth_123" };
    },
  });

  assert.equal(result.processed, 1);
  assert.deepEqual(delivered, {
    type: "EMAIL_VERIFICATION",
    email: delivery.recipient,
    name: delivery.recipientName,
    code: "123456",
  });
  assert.equal(completed.status, "delivered");
  assert.equal(completed.codeCiphertext, null);
  assert.equal(completed.providerMessageId, "resend_auth_123");
});

test("authentication email delivery moves terminal failures to a dead letter", async () => {
  const delivery = {
    id: "auth_email_dead",
    authCodeId: "auth_code_dead",
    recipient: "owner@example.com",
    recipientName: null,
    codeCiphertext: encryptSecret("654321"),
    status: "failed",
    attempts: 4,
    nextAttemptAt: new Date(0),
    createdAt: new Date(0),
    authCode: {
      type: "PASSWORD_RESET",
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    },
  };
  let completed;
  const prisma = {
    authEmailDelivery: {
      findMany: async () => [delivery],
      updateMany: async ({ data }) => {
        if (data.status !== "processing") completed = data;
        return { count: 1 };
      },
    },
    authCode: { findUnique: async () => delivery.authCode },
  };

  const result = await drainAuthEmailOutbox({
    prisma,
    send: async () => ({ success: false, error: "provider\nfailed" }),
  });

  assert.equal(result.processed, 1);
  assert.equal(completed.status, "dead_letter");
  assert.equal(completed.attempts, 5);
  assert.equal(completed.error, "provider failed");
  assert.equal(completed.codeCiphertext, null);
  assert.ok(completed.deadLetteredAt instanceof Date);
});

test("distributed rate-limit counters are atomic, hashed, and window-bound", async () => {
  const counts = new Map();
  const persistedKeys = [];
  const prisma = {
    $queryRaw: async (_strings, key) => {
      persistedKeys.push(key);
      const count = (counts.get(key) || 0) + 1;
      counts.set(key, count);
      return [{ count }];
    },
  };
  const input = {
    prisma,
    namespace: "auth",
    identity: "198.51.100.4:owner@example.com",
    requests: 2,
    windowMs: 60_000,
    now: new Date("2026-08-08T12:00:05.000Z"),
  };

  const first = await consumeRateLimit(input);
  const second = await consumeRateLimit(input);
  const third = await consumeRateLimit(input);
  const nextWindow = await consumeRateLimit({
    ...input,
    now: new Date("2026-08-08T12:01:05.000Z"),
  });

  assert.equal(first.count, 1);
  assert.equal(second.count, 2);
  assert.equal(third.allowed, false);
  assert.equal(nextWindow.count, 1);
  assert.match(persistedKeys[0], /^[a-f0-9]{64}$/);
  assert.equal(persistedKeys[0].includes("owner@example.com"), false);
  assert.notEqual(persistedKeys[0], persistedKeys.at(-1));
});

test("webhook address classification blocks private and reserved networks", () => {
  for (const address of [
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.1.2",
    "100.64.0.1",
    "::1",
    "fc00::1",
    "2001:db8::1",
    "::ffff:127.0.0.1",
  ]) {
    assert.equal(isPublicAddress(address), false, address);
  }
  assert.equal(isPublicAddress("8.8.8.8"), true);
  assert.equal(isPublicAddress("2606:4700:4700::1111"), true);
});

test("decision transition is token-bound, atomic, and records the recipient", async () => {
  const approval = {
    id: "apr_123",
    userId: "usr_123",
    approvalToken: "token-hash",
    recipient: "reviewer@example.com",
    status: "PENDING",
    expiresAt: new Date(Date.now() + 60_000),
  };
  let updateWhere;
  let updateData;
  let auditLog;
  const prisma = {
    approval: { findFirst: async () => approval },
    $transaction: async (callback) => callback({
      approval: {
        updateMany: async ({ where, data }) => {
          updateWhere = where;
          updateData = data;
          return { count: 1 };
        },
        findUnique: async () => ({ ...approval, ...updateData }),
      },
      approvalLog: { create: async ({ data }) => { auditLog = data; } },
      webhook: { findMany: async () => [] },
    }),
  };

  const result = await transitionDecision({
    prisma,
    id: approval.id,
    tokenHash: approval.approvalToken,
    decision: "REJECTED",
    reason: "Needs a narrower scope",
  });

  assert.equal(result.outcome, "rejected");
  assert.equal(updateWhere.approvalToken, approval.approvalToken);
  assert.equal(updateWhere.status, "PENDING");
  assert.equal(updateData.decidedBy, approval.recipient);
  assert.equal(auditLog.event, "rejected");
  assert.equal(auditLog.metadata.decidedBy, approval.recipient);
});

test("approval cancellation replays the original success and rejects conflicting key reuse", async () => {
  const now = new Date("2026-08-08T12:00:00.000Z");
  const idempotencyKey = "cancel:approval:apr_cancel";
  const requestFingerprint = createRequestFingerprint({
    operation: "cancel",
    approval_id: "apr_cancel",
  });
  const approval = {
    id: "apr_cancel",
    userId: "usr_cancel",
    agentName: "Release agent",
    action: "deploy.release",
    summary: "Deploy release 42",
    details: { region: "lhr" },
    externalId: "release:42",
    metadata: { environment: "production" },
    status: "CANCELLED",
    channel: "EMAIL",
    recipient: "reviewer@example.com",
    decidedBy: null,
    decidedAt: null,
    rejectionReason: null,
    expiresAt: new Date("2026-08-08T13:00:00.000Z"),
    createdAt: now,
    updatedAt: now,
    cancelIdempotencyKey: idempotencyKey,
    cancelRequestFingerprint: requestFingerprint,
  };
  const prisma = {
    $transaction: async (callback) => callback({
      approval: { findFirst: async () => approval },
    }),
  };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.apiKey = { userId: approval.userId };
    req.prisma = prisma;
    next();
  });
  app.use(approvalsRouter);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  try {
    const replay = await fetch(`http://127.0.0.1:${port}/${approval.id}/cancel`, {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
    });
    const replayBody = await replay.json();
    assert.equal(replay.status, 200);
    assert.equal(replay.headers.get("Idempotent-Replayed"), "true");
    assert.equal(replayBody.id, approval.id);
    assert.equal(replayBody.status, "cancelled");
    assert.equal(replayBody.external_id, approval.externalId);
    assert.deepEqual(replayBody.metadata, approval.metadata);

    approval.cancelRequestFingerprint = "fingerprint-from-another-operation";
    const conflict = await fetch(`http://127.0.0.1:${port}/${approval.id}/cancel`, {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
    });
    const conflictBody = await conflict.json();
    assert.equal(conflict.status, 409);
    assert.equal(conflictBody.error.code, "idempotency_conflict");
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (
      error ? reject(error) : resolve()
    )));
  }
});

test("API key mode is persisted and returned independently from the account plan", async () => {
  const user = {
    id: "usr_key_mode",
    email: "owner@example.com",
    name: "Owner",
    plan: "BUSINESS",
    emailVerified: true,
    sessionVersion: 0,
  };
  const session = signSession(user);
  let stored;
  const prisma = {
    user: { findUnique: async () => user },
    apiKey: {
      create: async ({ data }) => {
        stored = {
          id: "key_test",
          ...data,
          revokedAt: null,
          lastUsedAt: null,
          createdAt: new Date("2026-08-08T12:00:00.000Z"),
        };
        return stored;
      },
      findMany: async () => [stored],
    },
  };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.prisma = prisma; next(); });
  app.use(apiKeysRouter);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  try {
    const createdResponse = await fetch(`http://127.0.0.1:${port}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Staging agent", mode: "test" }),
    });
    const created = await createdResponse.json();
    assert.equal(createdResponse.status, 201);
    assert.equal(stored.mode, "TEST");
    assert.equal(stored.plan, "BUSINESS");
    assert.equal(created.mode, "test");
    assert.equal(created.plan, "business");
    assert.match(created.key, /^appr_test_/);

    const listResponse = await fetch(`http://127.0.0.1:${port}`, {
      headers: { Authorization: `Bearer ${session}` },
    });
    const list = await listResponse.json();
    assert.equal(listResponse.status, 200);
    assert.equal(list.keys[0].mode, "test");
    assert.equal(list.keys[0].plan, "business");
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (
      error ? reject(error) : resolve()
    )));
  }
});

test("signup and password reset reject passwords shorter than twelve characters", async () => {
  const prisma = {
    user: { findUnique: async () => { throw new Error("Password validation should run first."); } },
  };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.prisma = prisma; next(); });
  app.use(authRouter);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  try {
    const signup = await fetch(`http://127.0.0.1:${port}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "owner@example.com", password: "12345678901" }),
    });
    const signupBody = await signup.json();
    assert.equal(signup.status, 400);
    assert.equal(signupBody.error.code, "invalid_request");
    assert.match(signupBody.error.message, /at least 12 characters/i);

    const reset = await fetch(`http://127.0.0.1:${port}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "owner@example.com",
        code: "123456",
        newPassword: "12345678901",
      }),
    });
    const resetBody = await reset.json();
    assert.equal(reset.status, 400);
    assert.equal(resetBody.error.code, "invalid_request");
    assert.match(resetBody.error.message, /between 12 and 128 characters/i);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (
      error ? reject(error) : resolve()
    )));
  }
});

test("test webhooks persist failed attempts and expose the actual attempt timestamp", async () => {
  const user = {
    id: "usr_webhook_test",
    email: "owner@example.com",
    name: "Owner",
    plan: "BUSINESS",
    emailVerified: true,
    sessionVersion: 0,
  };
  const session = signSession(user);
  const webhook = {
    id: "wh_test",
    userId: user.id,
    url: "https://127.0.0.1/hook",
    secret: "whsec_test",
    events: ["approval.approved"],
    active: true,
    createdAt: new Date("2026-08-08T12:00:00.000Z"),
  };
  let createdDelivery;
  let completedDelivery;
  const prisma = {
    user: { findUnique: async () => user },
    webhook: { findFirst: async () => webhook },
    webhookDelivery: {
      create: async ({ data }) => {
        createdDelivery = { id: "delivery_test", ...data, createdAt: new Date() };
        return createdDelivery;
      },
      update: async ({ data }) => {
        completedDelivery = { ...createdDelivery, ...data };
        return completedDelivery;
      },
      findMany: async () => [completedDelivery],
    },
  };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.prisma = prisma; next(); });
  app.use(webhooksRouter);
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  try {
    const testResponse = await fetch(`http://127.0.0.1:${port}/${webhook.id}/test`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session}` },
    });
    const testBody = await testResponse.json();
    assert.equal(testResponse.status, 502);
    assert.equal(testBody.delivery_id, "delivery_test");
    assert.equal(createdDelivery.status, "processing");
    assert.equal(completedDelivery.status, "failed");
    assert.equal(completedDelivery.attempts, 1);
    assert.ok(completedDelivery.lastAttemptAt instanceof Date);

    const historyResponse = await fetch(`http://127.0.0.1:${port}/${webhook.id}/deliveries`, {
      headers: { Authorization: `Bearer ${session}` },
    });
    const history = await historyResponse.json();
    assert.equal(historyResponse.status, 200);
    assert.equal(history.deliveries[0].id, "delivery_test");
    assert.equal(
      history.deliveries[0].last_attempt_at,
      completedDelivery.lastAttemptAt.toISOString(),
    );
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (
      error ? reject(error) : resolve()
    )));
  }
});
