export const NODSEND_DEFAULT_BASE_URL = "https://api.nodsend.com";

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "cancelled";

export interface Approval {
  id: string;
  status: ApprovalStatus;
  action: string;
  summary: string;
  details: Record<string, unknown>;
  channel: "email";
  recipient: string;
  agent_name: string | null;
  external_id: string | null;
  metadata: Record<string, unknown>;
  decided_by: string | null;
  rejection_reason: string | null;
  expires_at: string;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateApprovalInput {
  action: string;
  summary: string;
  recipient: string;
  details?: Record<string, unknown>;
  channel?: "email";
  expires_in?: string;
  webhook_id?: string | null;
  agent_name?: string | null;
  external_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface RequestOptions {
  signal?: AbortSignal;
}

export interface NodsendOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

interface ApiErrorEnvelope {
  error?: {
    code?: unknown;
    message?: unknown;
    request_id?: unknown;
    details?: unknown;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertApproval(value: unknown): asserts value is Approval {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.status !== "string" ||
    !["pending", "approved", "rejected", "expired", "cancelled"].includes(value.status)
  ) {
    throw new NodsendError("Nodsend returned an invalid approval response.");
  }
}

function combineSignals(signal: AbortSignal | undefined, timeoutMs: number): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error("Nodsend request timed out.")), timeoutMs);
  const abort = () => controller.abort(signal?.reason);
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
    },
  };
}

export class NodsendError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "NodsendError";
  }
}

export class NodsendApiError extends NodsendError {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | null;
  readonly details: unknown;

  constructor(options: {
    message: string;
    status: number;
    code: string;
    requestId: string | null;
    details?: unknown;
  }) {
    super(options.message);
    this.name = "NodsendApiError";
    this.status = options.status;
    this.code = options.code;
    this.requestId = options.requestId;
    this.details = options.details;
  }
}

export class Nodsend {
  readonly approvals: {
    create: (
      input: CreateApprovalInput,
      idempotencyKey: string,
      options?: RequestOptions,
    ) => Promise<Approval>;
    retrieve: (approvalId: string, options?: RequestOptions) => Promise<Approval>;
  };

  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #timeoutMs: number;
  readonly #fetch: typeof fetch;

  constructor(options: NodsendOptions) {
    if (!options.apiKey.trim()) throw new NodsendError("apiKey is required.");
    const timeoutMs = options.timeoutMs ?? 10_000;
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) {
      throw new NodsendError("timeoutMs must be an integer between 1 and 120000.");
    }
    this.#apiKey = options.apiKey;
    this.#baseUrl = (options.baseUrl ?? NODSEND_DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.#timeoutMs = timeoutMs;
    this.#fetch = options.fetch ?? globalThis.fetch;
    if (typeof this.#fetch !== "function") {
      throw new NodsendError("A Fetch API implementation is required.");
    }
    this.approvals = {
      create: async (input, idempotencyKey, requestOptions) => {
        if (idempotencyKey.length < 8 || idempotencyKey.length > 255) {
          throw new NodsendError("idempotencyKey must contain between 8 and 255 characters.");
        }
        const approval = await this.#request("/v1/approvals", {
          method: "POST",
          headers: { "Idempotency-Key": idempotencyKey },
          body: JSON.stringify(input),
          ...(requestOptions?.signal === undefined ? {} : { signal: requestOptions.signal }),
        });
        assertApproval(approval);
        return approval;
      },
      retrieve: async (approvalId, requestOptions) => {
        if (!approvalId.trim()) throw new NodsendError("approvalId is required.");
        const approval = await this.#request(
          `/v1/approvals/${encodeURIComponent(approvalId)}`,
          {
            method: "GET",
            ...(requestOptions?.signal === undefined ? {} : { signal: requestOptions.signal }),
          },
        );
        assertApproval(approval);
        return approval;
      },
    };
  }

  async #request(
    path: string,
    options: {
      method: "GET" | "POST";
      headers?: Record<string, string>;
      body?: string;
      signal?: AbortSignal;
    },
  ): Promise<unknown> {
    const combined = combineSignals(options.signal, this.#timeoutMs);
    try {
      const response = await this.#fetch(`${this.#baseUrl}${path}`, {
        method: options.method,
        headers: {
          Authorization: `Bearer ${this.#apiKey}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": "nodsend-typescript/0.1.0",
          ...options.headers,
        },
        ...(options.body === undefined ? {} : { body: options.body }),
        signal: combined.signal,
      });
      const body = await response.json().catch(() => undefined) as unknown;
      if (!response.ok) {
        const envelope = isRecord(body) ? body as ApiErrorEnvelope : undefined;
        const error = envelope?.error;
        throw new NodsendApiError({
          message: typeof error?.message === "string"
            ? error.message
            : `Nodsend request failed with HTTP ${response.status}.`,
          status: response.status,
          code: typeof error?.code === "string" ? error.code : "api_error",
          requestId: typeof error?.request_id === "string"
            ? error.request_id
            : response.headers.get("Nodsend-Request-Id"),
          details: error?.details,
        });
      }
      return body;
    } catch (error) {
      if (error instanceof NodsendError) throw error;
      throw new NodsendError("Unable to reach Nodsend.", { cause: error });
    } finally {
      combined.cleanup();
    }
  }
}
