import assert from "node:assert/strict";
import test from "node:test";

import {
  approvalIdempotencyKey,
  evaluateToolCall,
  redactParams,
} from "../dist/policy.js";

const config = {
  reviewerEmail: "reviewer@example.com",
  protectedTools: ["exec", "message"],
  expiresIn: "1h",
  requestTimeoutMs: 10_000,
};

function approval(status) {
  return {
    id: "apr_test",
    status,
    action: "openclaw.tool_call.exec",
    summary: "Allow OpenClaw to call exec",
    details: {},
    channel: "email",
    recipient: "reviewer@example.com",
    agent_name: "OpenClaw",
    external_id: "openclaw:test",
    metadata: {},
    decided_by: null,
    rejection_reason: null,
    expires_at: "2026-08-12T12:00:00.000Z",
    decided_at: null,
    created_at: "2026-08-12T11:00:00.000Z",
    updated_at: "2026-08-12T11:00:00.000Z",
  };
}

test("unprotected tools do not call Nodsend", async () => {
  const client = { approvals: { create: async () => { throw new Error("must not run"); } } };
  const result = await evaluateToolCall({
    client,
    config,
    call: { toolName: "read", params: {} },
  });
  assert.equal(result, undefined);
});

test("protected calls are fail-closed while approval is pending", async () => {
  let input;
  let key;
  const client = { approvals: { create: async (value, idempotencyKey) => {
    input = value;
    key = idempotencyKey;
    return approval("pending");
  } } };
  const call = {
    toolName: "exec",
    params: { command: "deploy", token: "secret", nested: { password: "hidden" } },
    sessionKey: "session-secret-value",
    runId: "run_1",
    toolCallId: "tool_call_1",
  };

  const result = await evaluateToolCall({ client, config, call });

  assert.equal(result.block, true);
  assert.match(result.blockReason, /pending/);
  assert.equal(input.details.params.token, "[REDACTED]");
  assert.equal(input.details.params.nested.password, "[REDACTED]");
  assert.equal(input.metadata.session_key_hash.length, 64);
  assert.notEqual(input.metadata.session_key_hash, call.sessionKey);
  assert.equal(key, approvalIdempotencyKey(call));
});

test("stable call identity produces a stable idempotency key", () => {
  const callA = { toolName: "exec", params: { b: 2, a: 1 }, sessionKey: "s", runId: "r" };
  const callB = { toolName: "exec", params: { a: 1, b: 2 }, sessionKey: "s", runId: "r" };
  assert.equal(approvalIdempotencyKey(callA), approvalIdempotencyKey(callB));
  assert.match(approvalIdempotencyKey(callA), /^openclaw_[a-f0-9]{64}$/);

  const toolCallA = { toolName: "exec", params: {}, sessionKey: "session-a", toolCallId: "call-1" };
  const toolCallB = { toolName: "exec", params: {}, sessionKey: "session-b", toolCallId: "call-1" };
  assert.notEqual(approvalIdempotencyKey(toolCallA), approvalIdempotencyKey(toolCallB));
});

test("an approved request remains blocked until safe host resumption exists", async () => {
  const client = { approvals: { create: async () => approval("approved") } };
  const result = await evaluateToolCall({
    client,
    config,
    call: { toolName: "exec", params: {}, toolCallId: "tool_call_1" },
  });
  assert.equal(result.block, true);
  assert.match(result.blockReason, /cannot safely resume/);
});

test("redaction is bounded and does not mutate the source", () => {
  const source = {
    authorization: "Bearer secret",
    unlabeledCredential: "appr_live_not-for-approval-details",
    values: Array.from({ length: 30 }, (_, i) => i),
  };
  const redacted = redactParams(source);
  assert.equal(redacted.authorization, "[REDACTED]");
  assert.equal(redacted.unlabeledCredential, "[REDACTED]");
  assert.equal(redacted.values.length, 20);
  assert.equal(source.authorization, "Bearer secret");
  assert.equal(source.values.length, 30);
});
