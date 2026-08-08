export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired" | "cancelled";

export interface ApprovalRecord {
  id: string;
  agent_name: string;
  action: string;
  summary: string;
  status: ApprovalStatus;
  channel: string;
  recipient: string;
  expires_at: string;
  decided_at: string | null;
  decided_by?: string | null;
  created_at: string;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  key_prefix: string;
  mode: "live" | "test";
  plan: string;
  revoked: boolean;
  created_at: string;
  last_used_at: string | null;
}

export interface WebhookRecord {
  id: string;
  url: string;
  active: boolean;
  events: string[];
  created_at: string;
}

export interface WebhookDelivery {
  id: string;
  event_type: string;
  status: "pending" | "delivered" | "failed" | string;
  status_code: number | null;
  error: string | null;
  delivered_at: string | null;
  last_attempt_at: string | null;
  created_at: string;
}

export interface DashboardUser {
  email: string;
  name?: string | null;
  plan?: string;
  email_verified?: boolean;
  twoFactorEnabled?: boolean;
}

export interface ApiErrorBody {
  error?: { message?: string };
}

export function formatShortDate(value: string | null | undefined) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export async function readApiError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return body.error?.message || fallback;
  } catch {
    return fallback;
  }
}
