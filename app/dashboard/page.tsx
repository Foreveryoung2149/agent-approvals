"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, LoadingState, MetricCard, PageHeader, Panel } from "../components/DashboardUI";
import { ErrorState, StatusBadge } from "../components/dashboard/DashboardControls";
import type { ApiKeyRecord, ApprovalRecord, WebhookRecord } from "../components/dashboard/types";
import { formatShortDate, readApiError } from "../components/dashboard/types";
import { Icon } from "../components/Icon";
import { apiFetch } from "../lib/api";

interface OverviewData {
  approvals: ApprovalRecord[];
  keys: ApiKeyRecord[];
  webhooks: WebhookRecord[];
}

export default function DashboardPage() {
  const [data, setData] = useState<OverviewData>({ approvals: [], keys: [], webhooks: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const [approvalsResponse, keysResponse, webhooksResponse] = await Promise.all([
        apiFetch("/v1/approvals?limit=100", { signal }),
        apiFetch("/v1/api-keys", { signal }),
        apiFetch("/v1/webhooks", { signal }),
      ]);

      if (!approvalsResponse.ok) throw new Error(await readApiError(approvalsResponse, "Approval activity is unavailable."));
      if (!keysResponse.ok) throw new Error(await readApiError(keysResponse, "API key data is unavailable."));
      if (!webhooksResponse.ok) throw new Error(await readApiError(webhooksResponse, "Webhook data is unavailable."));

      const [approvalsBody, keysBody, webhooksBody] = await Promise.all([
        approvalsResponse.json() as Promise<{ approvals?: ApprovalRecord[] }>,
        keysResponse.json() as Promise<{ keys?: ApiKeyRecord[] }>,
        webhooksResponse.json() as Promise<{ webhooks?: WebhookRecord[] }>,
      ]);
      setData({
        approvals: approvalsBody.approvals || [],
        keys: keysBody.keys || [],
        webhooks: webhooksBody.webhooks || [],
      });
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") return;
      setError(loadError instanceof Error ? loadError.message : "Dashboard data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadDashboard(controller.signal);
    return () => controller.abort();
  }, [loadDashboard]);

  if (loading) return <LoadingState label="Loading command center" />;
  if (error) return <ErrorState message={error} onRetry={() => void loadDashboard()} />;

  const recent = data.approvals;
  const pending = recent.filter((approval) => approval.status === "pending").length;
  const approved = recent.filter((approval) => approval.status === "approved").length;
  const rejected = recent.filter((approval) => approval.status === "rejected").length;
  const activeKeys = data.keys.filter((key) => !key.revoked).length;
  const activeWebhooks = data.webhooks.filter((webhook) => webhook.active).length;
  const setupComplete = activeKeys > 0 && activeWebhooks > 0 && recent.length > 0;

  return (
    <div>
      <PageHeader
        eyebrow="Live workspace"
        title="Command center"
        description="A clear view of the latest 100 approval requests and your delivery readiness."
        actions={<Link href="/docs" className="btn-secondary"><Icon name="terminal" size={16} />Quickstart</Link>}
      />

      <div className="metrics-grid" aria-label="Recent approval metrics">
        <MetricCard label="Recent requests" value={recent.length} note="Latest 100 maximum" icon="activity" />
        <MetricCard label="Awaiting a decision" value={pending} note="Needs human attention" icon="clock" tone="warning" />
        <MetricCard label="Approved" value={approved} note="Within this recent window" icon="approval" tone="success" />
        <MetricCard label="Rejected" value={rejected} note="Within this recent window" icon="shield" tone="danger" />
      </div>

      <div className="dash-grid">
        <Panel
          title="Recent decision traffic"
          description="Your newest approval requests, ordered by creation time."
          action={<Link href="/dashboard/approvals" className="dash-text-link">View all <Icon name="arrow" size={14} /></Link>}
        >
          {recent.length === 0 ? (
            <EmptyState
              icon="approval"
              title="No approval traffic yet"
              description="Create an API key, connect an agent, and your decisions will appear here in real time."
              action={<Link href="/docs" className="btn-primary">Send your first request</Link>}
            />
          ) : (
            <div className="dash-table-wrap" role="region" aria-label="Recent approval requests" tabIndex={0}>
              <table className="data-table">
                <thead><tr><th>Action</th><th>Agent</th><th>Status</th><th>Channel</th><th>Created</th></tr></thead>
                <tbody>
                  {recent.slice(0, 8).map((approval) => (
                    <tr key={approval.id}>
                      <td data-label="Action"><code className="dash-code-value">{approval.action}</code><small className="dash-row-summary">{approval.summary}</small></td>
                      <td data-label="Agent">{approval.agent_name}</td>
                      <td data-label="Status"><StatusBadge status={approval.status} /></td>
                      <td data-label="Channel" className="dash-capitalize">{approval.channel}</td>
                      <td data-label="Created">{formatShortDate(approval.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Launch readiness" description={setupComplete ? "Your control loop is connected." : "Finish these steps to go live."}>
          <ol className="dash-checklist">
            <li data-complete={activeKeys > 0}>
              <span><Icon name={activeKeys > 0 ? "check" : "key"} size={16} /></span>
              <div><strong>Create an API key</strong><small>{activeKeys > 0 ? `${activeKeys} active key${activeKeys === 1 ? "" : "s"}` : "Authenticate your agent"}</small></div>
              <Link href="/dashboard/api-keys" aria-label="Manage API keys"><Icon name="chevron" size={16} /></Link>
            </li>
            <li data-complete={activeWebhooks > 0}>
              <span><Icon name={activeWebhooks > 0 ? "check" : "webhook"} size={16} /></span>
              <div><strong>Connect a webhook</strong><small>{activeWebhooks > 0 ? `${activeWebhooks} active endpoint${activeWebhooks === 1 ? "" : "s"}` : "Receive signed outcomes"}</small></div>
              <Link href="/dashboard/webhooks" aria-label="Manage webhooks"><Icon name="chevron" size={16} /></Link>
            </li>
            <li data-complete={recent.length > 0}>
              <span><Icon name={recent.length > 0 ? "check" : "approval"} size={16} /></span>
              <div><strong>Send a test approval</strong><small>{recent.length > 0 ? "Decision traffic received" : "Verify the human loop"}</small></div>
              <Link href="/docs" aria-label="Read approval quickstart"><Icon name="chevron" size={16} /></Link>
            </li>
          </ol>
        </Panel>
      </div>
    </div>
  );
}
