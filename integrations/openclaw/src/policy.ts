import { createHash } from "node:crypto";

import type { Approval, Nodsend } from "@nodsend/sdk";

export interface NodsendOpenClawConfig {
  reviewerEmail: string;
  protectedTools: string[];
  expiresIn: string;
  requestTimeoutMs: number;
}

export interface OpenClawCall {
  toolName: string;
  params: Record<string, unknown>;
  agentId?: string;
  sessionKey?: string;
  runId?: string;
  toolCallId?: string;
  signal?: AbortSignal;
}

export interface GateDecision {
  block: true;
  blockReason: string;
}

const SECRET_KEY_PATTERN = /(?:api[-_]?key|authorization|bearer|cookie|credential|password|private[-_]?key|secret|session[-_]?token|token)/i;
const SECRET_VALUE_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /^Bearer\s+\S+/i,
  /^(?:appr|sk|rk)_(?:live|test)_[A-Za-z0-9_-]+$/,
];
const TOOL_ID_PATTERN = /^[A-Za-z0-9_.:-]+$/;
const MAX_DEPTH = 5;
const MAX_KEYS = 50;
const MAX_ARRAY_ITEMS = 20;
const MAX_STRING_LENGTH = 500;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function redactValue(value: unknown, depth = 0): unknown {
  if (depth >= MAX_DEPTH) return "[TRUNCATED]";
  if (typeof value === "string") {
    if (SECRET_VALUE_PATTERNS.some((pattern) => pattern.test(value))) return "[REDACTED]";
    return value.length <= MAX_STRING_LENGTH
      ? value
      : `${value.slice(0, MAX_STRING_LENGTH)}...[TRUNCATED]`;
  }
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_ITEMS).map((item) => redactValue(item, depth + 1));
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).slice(0, MAX_KEYS).map(([key, item]) => [
        key,
        SECRET_KEY_PATTERN.test(key) ? "[REDACTED]" : redactValue(item, depth + 1),
      ]),
    );
  }
  return `[${typeof value}]`;
}

export function redactParams(params: Record<string, unknown>): Record<string, unknown> {
  return redactValue(params) as Record<string, unknown>;
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (isRecord(value)) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

export function approvalFingerprint(call: OpenClawCall): string {
  const identity = call.toolCallId
    ? {
        agentId: call.agentId ?? null,
        sessionKey: call.sessionKey ?? null,
        runId: call.runId ?? null,
        toolCallId: call.toolCallId,
        toolName: call.toolName,
      }
    : {
        agentId: call.agentId ?? null,
        sessionKey: call.sessionKey ?? null,
        runId: call.runId ?? null,
        toolName: call.toolName,
        params: stable(redactParams(call.params)),
      };
  return createHash("sha256").update(JSON.stringify(identity)).digest("hex");
}

export function approvalIdempotencyKey(call: OpenClawCall): string {
  return `openclaw_${approvalFingerprint(call)}`;
}

export function approvalAction(toolName: string): string {
  const normalized = toolName.replace(/[^A-Za-z0-9_.:-]/g, "_").slice(0, 170);
  return `openclaw.tool_call.${normalized || "unknown"}`;
}

export function parseConfig(value: unknown): NodsendOpenClawConfig {
  if (!isRecord(value)) throw new Error("Nodsend plugin config is missing.");
  const reviewerEmail = typeof value.reviewerEmail === "string" ? value.reviewerEmail.trim() : "";
  const protectedTools = Array.isArray(value.protectedTools)
    ? value.protectedTools.filter((item): item is string => typeof item === "string").map((item) => item.trim())
    : [];
  if (!reviewerEmail || !reviewerEmail.includes("@")) throw new Error("reviewerEmail is invalid.");
  if (protectedTools.length === 0 || protectedTools.some((tool) => !TOOL_ID_PATTERN.test(tool))) {
    throw new Error("protectedTools must contain only exact canonical tool ids.");
  }
  return {
    reviewerEmail,
    protectedTools: [...new Set(protectedTools)],
    expiresIn: typeof value.expiresIn === "string" ? value.expiresIn : "1h",
    requestTimeoutMs: typeof value.requestTimeoutMs === "number" ? value.requestTimeoutMs : 10_000,
  };
}

function decisionMessage(approval: Approval): string {
  switch (approval.status) {
    case "approved":
      return `Nodsend approval ${approval.id} is approved, but this experimental plugin cannot safely resume the blocked OpenClaw call. The tool was not executed.`;
    case "pending":
      return `Nodsend approval ${approval.id} is pending. The tool was not executed. Retry after the reviewer decides.`;
    case "rejected":
      return `Nodsend approval ${approval.id} was rejected. The tool was not executed.`;
    case "expired":
      return `Nodsend approval ${approval.id} expired. The tool was not executed.`;
    case "cancelled":
      return `Nodsend approval ${approval.id} was cancelled. The tool was not executed.`;
  }
}

export async function evaluateToolCall(options: {
  client: Pick<Nodsend, "approvals">;
  config: NodsendOpenClawConfig;
  call: OpenClawCall;
}): Promise<GateDecision | undefined> {
  if (!options.config.protectedTools.includes(options.call.toolName)) return undefined;

  const fingerprint = approvalFingerprint(options.call);
  const approval = await options.client.approvals.create(
    {
      action: approvalAction(options.call.toolName),
      summary: `Allow OpenClaw to call ${options.call.toolName}`,
      recipient: options.config.reviewerEmail,
      details: {
        tool: options.call.toolName,
        params: redactParams(options.call.params),
      },
      agent_name: "OpenClaw",
      expires_in: options.config.expiresIn,
      external_id: `openclaw:${fingerprint}`,
      metadata: {
        source: "openclaw",
        agent_id: options.call.agentId ?? null,
        session_key_hash: options.call.sessionKey
          ? createHash("sha256").update(options.call.sessionKey).digest("hex")
          : null,
        run_id: options.call.runId ?? null,
        tool_call_id: options.call.toolCallId ?? null,
      },
    },
    approvalIdempotencyKey(options.call),
    options.call.signal === undefined ? {} : { signal: options.call.signal },
  );

  // Deliberately block even after approval. The OpenClaw hook contract does not
  // promise that a remotely approved, previously blocked call can auto-resume.
  // Requiring a retry preserves the host's normal tool-call policy pipeline.
  return { block: true, blockReason: decisionMessage(approval) };
}
