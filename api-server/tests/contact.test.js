import assert from "node:assert/strict";
import test from "node:test";
import express from "express";

import { contactRateLimiter } from "../middleware/rate-limiter.js";
import { createContactRouter } from "../routes/contact.js";

async function withServer(app, run) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    const { port } = server.address();
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (
      error ? reject(error) : resolve()
    )));
  }
}

function contactApp(send) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.requestId = "request_contact_test";
    next();
  });
  app.use(createContactRouter({ send }));
  return app;
}

const validMessage = {
  name: "  Ada Lovelace  ",
  email: "  ADA@Example.com  ",
  category: "enterprise",
  subject: "  Production architecture review  ",
  message: "  We are protecting deployment actions and need an architecture review.  ",
  website: "",
};

test("contact intake validates, normalizes, and delivers an accepted message", async () => {
  const deliveries = [];
  await withServer(contactApp(async (message) => {
    deliveries.push(message);
    return { success: true, emailId: "email_123" };
  }), async (baseUrl) => {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validMessage),
    });
    const body = await response.json();

    assert.equal(response.status, 202);
    assert.equal(body.ok, true);
    assert.equal(deliveries.length, 1);
    assert.deepEqual(deliveries[0], {
      name: "Ada Lovelace",
      email: "ada@example.com",
      category: "enterprise",
      subject: "Production architecture review",
      message: "We are protecting deployment actions and need an architecture review.",
      requestId: "request_contact_test",
    });
  });
});

test("contact intake rejects malformed input without invoking delivery", async () => {
  let delivered = false;
  await withServer(contactApp(async () => {
    delivered = true;
    return { success: true };
  }), async (baseUrl) => {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validMessage, message: "Too short" }),
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.code, "invalid_request");
    assert.equal(delivered, false);
  });
});

test("contact honeypot accepts automated submissions without sending mail", async () => {
  let delivered = false;
  await withServer(contactApp(async () => {
    delivered = true;
    return { success: true };
  }), async (baseUrl) => {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validMessage, website: "https://spam.example" }),
    });
    const body = await response.json();

    assert.equal(response.status, 202);
    assert.equal(body.ok, true);
    assert.equal(delivered, false);
  });
});

test("contact intake hides provider errors from the public response", async () => {
  await withServer(contactApp(async () => ({
    success: false,
    error: "provider-key-and-account-details-must-not-leak",
  })), async (baseUrl) => {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validMessage),
    });
    const body = await response.json();

    assert.equal(response.status, 503);
    assert.equal(body.error.code, "contact_delivery_unavailable");
    assert.doesNotMatch(JSON.stringify(body), /provider-key|account-details/);
  });
});

test("contact endpoint limits repeated submissions by source address", async () => {
  let count = 0;
  const app = express();
  app.use((req, _res, next) => {
    req.prisma = { $queryRaw: async () => [{ count: ++count }] };
    next();
  });
  app.post("/", contactRateLimiter, (_req, res) => res.status(204).end());

  await withServer(app, async (baseUrl) => {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await fetch(baseUrl, { method: "POST" });
      assert.equal(response.status, 204);
      assert.equal(response.headers.get("RateLimit-Limit"), "5");
    }
    const blocked = await fetch(baseUrl, { method: "POST" });
    const body = await blocked.json();
    assert.equal(blocked.status, 429);
    assert.equal(body.error.code, "rate_limited");
    assert.ok(Number(blocked.headers.get("Retry-After")) >= 1);
  });
});
