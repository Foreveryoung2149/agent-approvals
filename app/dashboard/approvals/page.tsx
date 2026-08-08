"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState, LoadingState, PageHeader, Panel } from "../../components/DashboardUI";
import { ErrorState, StatusBadge } from "../../components/dashboard/DashboardControls";
import type { ApprovalRecord, ApprovalStatus } from "../../components/dashboard/types";
import { formatDateTime, readApiError } from "../../components/dashboard/types";
import { Icon } from "../../components/Icon";
import { apiFetch } from "../../lib/api";

const filters: Array<"" | ApprovalStatus> = ["", "pending", "approved", "rejected", "expired", "cancelled"];

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<"" | ApprovalStatus>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadApprovals = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ limit: "100" });
      if (statusFilter) query.set("status", statusFilter);
      const response = await apiFetch(`/v1/approvals?${query.toString()}`, { signal });
      if (!response.ok) throw new Error(await readApiError(response, "Approval requests are unavailable."));
      const body = (await response.json()) as { approvals?: ApprovalRecord[] };
      setApprovals(body.approvals || []);
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") return;
      setError(loadError instanceof Error ? loadError.message : "Approval requests could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    void loadApprovals(controller.signal);
    return () => controller.abort();
  }, [loadApprovals]);

  const visibleApprovals = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return approvals;
    return approvals.filter((approval) =>
      [approval.agent_name, approval.action, approval.summary, approval.recipient, approval.channel]
        .some((value) => value?.toLowerCase().includes(query)),
    );
  }, [approvals, search]);

  return (
    <div>
      <PageHeader
        eyebrow="Decision queue"
        title="Approvals"
        description="Inspect the latest 100 requests, their recipients, and final outcomes."
        actions={
          <label className="dash-search">
            <Icon name="activity" size={16} />
            <span className="sr-only">Search approvals</span>
            <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search action, agent, recipient…" />
          </label>
        }
      />

      <Panel
        title="Request ledger"
        description={`${visibleApprovals.length} request${visibleApprovals.length === 1 ? "" : "s"} in this view`}
        action={
          <div className="filter-tabs" role="group" aria-label="Filter approvals by status">
            {filters.map((status) => (
              <button
                key={status || "all"}
                type="button"
                className="filter-tab"
                data-active={statusFilter === status}
                aria-pressed={statusFilter === status}
                onClick={() => setStatusFilter(status)}
              >
                {status || "All"}
              </button>
            ))}
          </div>
        }
      >
        {loading ? (
          <LoadingState label="Loading approval ledger" />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void loadApprovals()} />
        ) : visibleApprovals.length === 0 ? (
          <EmptyState
            icon="approval"
            title={search ? "No matching approvals" : statusFilter ? `No ${statusFilter} approvals` : "No approvals yet"}
            description={search ? "Try a different agent, action, or recipient." : "Requests created by your agents will appear here with their full decision state."}
          />
        ) : (
          <div className="dash-table-wrap" role="region" aria-label="Approval request ledger" tabIndex={0}>
            <table className="data-table">
              <thead><tr><th>Agent / action</th><th>Summary</th><th>Status</th><th>Recipient</th><th>Created</th></tr></thead>
              <tbody>
                {visibleApprovals.map((approval) => (
                  <tr key={approval.id}>
                    <td data-label="Agent / action"><strong className="dash-primary-value">{approval.agent_name}</strong><code className="dash-code-value">{approval.action}</code></td>
                    <td data-label="Summary"><span className="dash-summary-cell" title={approval.summary}>{approval.summary}</span></td>
                    <td data-label="Status"><StatusBadge status={approval.status} /></td>
                    <td data-label="Recipient"><span className="dash-break-value">{approval.recipient}</span></td>
                    <td data-label="Created">{formatDateTime(approval.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
