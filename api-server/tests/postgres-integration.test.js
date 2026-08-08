import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import express from "express";
import { PrismaClient } from "@prisma/client";

import { transitionDecision } from "../lib/approval-lifecycle.js";
import { decryptSecret } from "../lib/secret-box.js";
import { consumeRateLimit } from "../middleware/rate-limiter.js";
import { approvalsRouter } from "../routes/approvals.js";
import { authRouter } from "../routes/auth.js";

const databaseUrl = process.env.INTEGRATION_DATABASE_URL;
if (databaseUrl) process.env.DATABASE_URL = databaseUrl;
process.env.SESSION_SECRET ||= "integration-session-secret-that-is-at-least-thirty-two-characters";
process.env.AUTH_CODE_PEPPER ||= "integration-auth-pepper-that-is-at-least-thirty-two-characters";
process.env.TOTP_ENCRYPTION_KEY ||= "22".repeat(32);

test("real PostgreSQL preserves tenant, idempotency, decision, and outbox invariants", {
  skip: databaseUrl ? false : "Set INTEGRATION_DATABASE_URL to run PostgreSQL integration tests.",
}, async () => {
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  const suffix = crypto.randomUUID().replaceAll("-", "");
  const tenantAEmail = `tenant-a-${suffix}@example.com`;
  const tenantBEmail = `tenant-b-${suffix}@example.com`;
  const signupEmail = `signup-${suffix}@example.com`;
  const rateIdentity = `integration:${suffix}`;
  const rateNow = new Date();
  const rateWindowMs = 60_000;
  const rateWindowStart = Math.floor(rateNow.getTime() / rateWindowMs) * rateWindowMs;
  const rateKey = crypto
    .createHash("sha256")
    .update(`integration:${rateIdentity}:${rateWindowStart}`)
    .digest("hex");
  let server;

  try {
    const [tenantA, tenantB] = await Promise.all([
      prisma.user.create({
        data: {
          email: tenantAEmail,
          passwordHash: "integration-only",
          emailVerified: true,
          plan: "BUSINESS",
        },
      }),
      prisma.user.create({
        data: {
          email: tenantBEmail,
          passwordHash: "integration-only",
          emailVerified: true,
          plan: "BUSINESS",
        },
      }),
    ]);

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      const user = req.get("X-Test-Tenant") === "b" ? tenantB : tenantA;
      req.prisma = prisma;
      req.apiKey = {
        id: null,
        userId: user.id,
        plan: user.plan.toLowerCase(),
        principalType: "session",
        keyPrefix: "integration",
      };
      next();
    });
    app.use(approvalsRouter);
    app.use((error, _req, res, _next) => {
      res.status(500).json({ error: { code: "test_error", message: error.message } });
    });
    server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    const { port } = server.address();
    const apiUrl = `http://127.0.0.1:${port}`;

    const createBody = {
      action: "deploy.release",
      summary: "Deploy integration release",
      details: { region: "lhr" },
      recipient: "reviewer@example.com",
      external_id: `release:${suffix}`,
      metadata: { suite: "postgres" },
    };
    const createKey = `create:${suffix}`;
    const createdResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": createKey,
      },
      body: JSON.stringify(createBody),
    });
    const created = await createdResponse.json();
    assert.equal(createdResponse.status, 201);
    assert.equal(created.external_id, createBody.external_id);

    const replayResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": createKey,
      },
      body: JSON.stringify(createBody),
    });
    assert.equal(replayResponse.status, 201);
    assert.equal(replayResponse.headers.get("Idempotent-Replayed"), "true");
    assert.equal((await replayResponse.json()).id, created.id);

    const conflictingResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": createKey,
      },
      body: JSON.stringify({ ...createBody, summary: "Different request" }),
    });
    assert.equal(conflictingResponse.status, 409);
    assert.equal((await conflictingResponse.json()).error.code, "idempotency_conflict");

    const tenantIsolationResponse = await fetch(`${apiUrl}/${created.id}`, {
      headers: { "X-Test-Tenant": "b" },
    });
    assert.equal(tenantIsolationResponse.status, 404);

    const approvalDelivery = await prisma.approvalEmailDelivery.findUnique({
      where: { approvalId: created.id },
    });
    assert.equal(approvalDelivery.status, "pending");
    assert.match(decryptSecret(approvalDelivery.tokenCiphertext), /^[A-Za-z0-9_-]{43}$/);

    const cancelKey = `cancel:${suffix}`;
    const cancelResponse = await fetch(`${apiUrl}/${created.id}/cancel`, {
      method: "POST",
      headers: { "Idempotency-Key": cancelKey },
    });
    assert.equal(cancelResponse.status, 200);
    assert.equal((await cancelResponse.json()).status, "cancelled");
    const cancelReplayResponse = await fetch(`${apiUrl}/${created.id}/cancel`, {
      method: "POST",
      headers: { "Idempotency-Key": cancelKey },
    });
    assert.equal(cancelReplayResponse.status, 200);
    assert.equal(cancelReplayResponse.headers.get("Idempotent-Replayed"), "true");

    const decisionCreateResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": `decision:${suffix}`,
      },
      body: JSON.stringify({ ...createBody, external_id: `decision:${suffix}` }),
    });
    const decisionApproval = await decisionCreateResponse.json();
    assert.equal(decisionCreateResponse.status, 201);
    const decisionDelivery = await prisma.approvalEmailDelivery.findUnique({
      where: { approvalId: decisionApproval.id },
    });
    const tokenHash = (await prisma.approval.findUnique({
      where: { id: decisionApproval.id },
      select: { approvalToken: true },
    })).approvalToken;
    assert.ok(decryptSecret(decisionDelivery.tokenCiphertext));

    const outcomes = await Promise.all([
      transitionDecision({
        prisma,
        id: decisionApproval.id,
        tokenHash,
        decision: "APPROVED",
      }),
      transitionDecision({
        prisma,
        id: decisionApproval.id,
        tokenHash,
        decision: "REJECTED",
        reason: "Concurrent rejection",
      }),
    ]);
    assert.equal(outcomes.filter(({ outcome }) => outcome === "approved" || outcome === "rejected").length, 1);
    assert.equal(outcomes.filter(({ outcome }) => outcome === "conflict").length, 1);
    const finalDecision = await prisma.approval.findUnique({ where: { id: decisionApproval.id } });
    assert.ok(["APPROVED", "REJECTED"].includes(finalDecision.status));

    const signupApp = express();
    signupApp.use(express.json());
    signupApp.use((req, _res, next) => { req.prisma = prisma; next(); });
    signupApp.use(authRouter);
    const signupServer = signupApp.listen(0, "127.0.0.1");
    await new Promise((resolve) => signupServer.once("listening", resolve));
    try {
      const signupPort = signupServer.address().port;
      const signupResponse = await fetch(`http://127.0.0.1:${signupPort}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: signupEmail,
          password: "correct horse battery staple",
          name: "Integration User",
        }),
      });
      assert.equal(signupResponse.status, 201);
      const queuedAuthCode = await prisma.authCode.findFirst({
        where: { email: signupEmail },
        include: { emailDelivery: true },
      });
      assert.ok(queuedAuthCode);
      assert.equal(queuedAuthCode.emailDelivery.status, "pending");
      assert.match(decryptSecret(queuedAuthCode.emailDelivery.codeCiphertext), /^\d{6}$/);
    } finally {
      await new Promise((resolve, reject) => signupServer.close((error) => (
        error ? reject(error) : resolve()
      )));
    }

    const rateResults = await Promise.all(Array.from({ length: 5 }, () => consumeRateLimit({
      prisma,
      namespace: "integration",
      identity: rateIdentity,
      requests: 3,
      windowMs: rateWindowMs,
      now: rateNow,
    })));
    assert.deepEqual(rateResults.map(({ count }) => count).sort((a, b) => a - b), [1, 2, 3, 4, 5]);
    assert.equal(rateResults.filter(({ allowed }) => allowed).length, 3);
  } finally {
    if (server) {
      await new Promise((resolve, reject) => server.close((error) => (
        error ? reject(error) : resolve()
      )));
    }
    await prisma.rateLimitBucket.deleteMany({ where: { key: rateKey } }).catch(() => {});
    await prisma.user.deleteMany({
      where: { email: { in: [tenantAEmail, tenantBEmail, signupEmail] } },
    }).catch(() => {});
    await prisma.$disconnect();
  }
});
