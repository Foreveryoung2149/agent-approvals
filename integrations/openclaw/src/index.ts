import { Nodsend } from "@nodsend/sdk";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

import { evaluateToolCall, parseConfig } from "./policy.js";

const HOOK_TIMEOUT_MS = 14_000;

export default definePluginEntry({
  id: "nodsend-approval-gate",
  name: "Nodsend Approval Gate",
  description: "Fail-closed Nodsend approval for selected OpenClaw tool calls.",
  register(api) {
    api.on(
      "before_tool_call",
      async (event, context) => {
        try {
          const config = parseConfig(event.context?.pluginConfig);
          if (!config.protectedTools.includes(event.toolName)) return;
          const apiKey = process.env.NODSEND_API_KEY?.trim();
          if (!apiKey) {
            return { block: true, blockReason: "Nodsend is not configured; protected tool blocked." };
          }
          const client = new Nodsend({
            apiKey,
            timeoutMs: config.requestTimeoutMs,
          });
          return await evaluateToolCall({
            client,
            config,
            call: {
              toolName: event.toolName,
              params: event.params,
              ...(context.agentId === undefined ? {} : { agentId: context.agentId }),
              ...(context.sessionKey === undefined ? {} : { sessionKey: context.sessionKey }),
              ...(event.runId === undefined && context.runId === undefined
                ? {}
                : { runId: event.runId ?? context.runId }),
              ...(event.toolCallId === undefined && context.toolCallId === undefined
                ? {}
                : { toolCallId: event.toolCallId ?? context.toolCallId }),
              ...(context.abortSignal === undefined ? {} : { signal: context.abortSignal }),
            },
          });
        } catch {
          // Never leak API/network/config errors or credentials into transcripts.
          return { block: true, blockReason: "Nodsend could not verify approval; protected tool blocked." };
        }
      },
      {
        priority: 100,
        registrationId: "nodsend-tool-approval",
        timeoutMs: HOOK_TIMEOUT_MS,
      },
    );
  },
});

export * from "./policy.js";
