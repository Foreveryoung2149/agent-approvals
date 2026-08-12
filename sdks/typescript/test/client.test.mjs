import assert from "node:assert/strict";
import test from "node:test";

import { Nodsend, NodsendApiError, NodsendError } from "../dist/index.js";

const approval = {
  id: "apr_test",
  status: "pending",
  action: "openclaw.tool_call.exec",
  summary: "Run exec",
  details: {},
  channel: "email",
  recipient: "reviewer@example.com",
  agent_name: "OpenClaw",
  external_id: "oc_test",
  metadata: {},
  decided_by: null,
  rejection_reason: null,
  expires_at: "2026-08-12T12:00:00.000Z",
  decided_at: null,
  created_at: "2026-08-12T11:00:00.000Z",
  updated_at: "2026-08-12T11:00:00.000Z",
};

test("create sends bearer authentication and the stable idempotency key", async () => {
  let request;
  const client = new Nodsend({
    apiKey: "appr_live_secret",
    fetch: async (url, options) => {
      request = { url, options };
      return Response.json(approval, { status: 201 });
    },
  });

  const result = await client.approvals.create({
    action: "openclaw.tool_call.exec",
    summary: "Run exec",
    recipient: "reviewer@example.com",
  }, "oc_12345678");

  assert.equal(result.id, "apr_test");
  assert.equal(request.url, "https://api.nodsend.com/v1/approvals");
  assert.equal(request.options.headers.Authorization, "Bearer appr_live_secret");
  assert.equal(request.options.headers["Idempotency-Key"], "oc_12345678");
});

test("retrieve URL-encodes the approval id", async () => {
  let url;
  const client = new Nodsend({
    apiKey: "appr_live_secret",
    fetch: async (value) => {
      url = value;
      return Response.json({ ...approval, status: "approved" });
    },
  });

  const result = await client.approvals.retrieve("apr/id");
  assert.equal(result.status, "approved");
  assert.equal(url, "https://api.nodsend.com/v1/approvals/apr%2Fid");
});

test("API errors expose safe request metadata, not credentials", async () => {
  const client = new Nodsend({
    apiKey: "appr_live_secret",
    fetch: async () => Response.json({
      error: { code: "invalid_request", message: "Bad request", request_id: "req_123" },
    }, { status: 400 }),
  });

  await assert.rejects(
    client.approvals.retrieve("apr_test"),
    (error) => {
      assert.ok(error instanceof NodsendApiError);
      assert.equal(error.status, 400);
      assert.equal(error.code, "invalid_request");
      assert.equal(error.requestId, "req_123");
      assert.doesNotMatch(error.message, /appr_live_secret/);
      return true;
    },
  );
});

test("invalid idempotency keys fail before any request", async () => {
  const client = new Nodsend({ apiKey: "appr_live_secret", fetch: async () => {
    throw new Error("must not run");
  } });
  await assert.rejects(
    client.approvals.create({
      action: "openclaw.tool_call.exec",
      summary: "Run exec",
      recipient: "reviewer@example.com",
    }, "short"),
    NodsendError,
  );
});
