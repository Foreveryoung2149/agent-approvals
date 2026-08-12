declare module "openclaw/plugin-sdk/plugin-entry" {
  export interface PluginHookContext {
    agentId?: string;
    sessionKey?: string;
    runId?: string;
    toolCallId?: string;
    abortSignal?: AbortSignal;
    [key: string]: unknown;
  }

  export interface BeforeToolCallEvent {
    toolName: string;
    params: Record<string, unknown>;
    runId?: string;
    toolCallId?: string;
    context?: { pluginConfig?: unknown };
  }

  export interface OpenClawPluginApi {
    on(
      name: "before_tool_call",
      handler: (
        event: BeforeToolCallEvent,
        context: PluginHookContext,
      ) => Promise<{ block: true; blockReason: string } | void>,
      options?: {
        matcher?: string[];
        priority?: number;
        registrationId?: string;
        timeoutMs?: number;
      },
    ): void;
  }

  export function definePluginEntry(options: {
    id: string;
    name: string;
    description: string;
    register(api: OpenClawPluginApi): void;
  }): unknown;
}
