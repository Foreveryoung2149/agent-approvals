"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

interface Approval {
  id: string;
  agentName: string;
  action: string;
  summary: string;
  status: string;
  channel: string;
  recipient: string;
  expires_at: string;
  decided_at: string | null;
  decided_by: string | null;
  created_at: string;
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApprovals();
  }, [statusFilter]);

  async function loadApprovals() {
    setLoading(true);
    try {
      const query = statusFilter ? `?status=${statusFilter}&limit=100` : "?limit=100";
      const res = await apiFetch(`/v1/approvals${query}`);
      if (res.ok) {
        const data = await res.json();
        setApprovals(data.approvals || []);
      }
    } catch {
      // silent
    }
    setLoading(false);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--gray-12)", margin: 0 }}>
          Approvals
        </h1>

        {/* Status filter */}
        <div style={{ display: "flex", gap: "6px" }}>
          {["", "pending", "approved", "rejected", "expired"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: statusFilter === s ? "1px solid var(--accent-border)" : "1px solid var(--gray-4)",
                background: statusFilter === s ? "var(--accent-muted)" : "transparent",
                color: statusFilter === s ? "var(--accent)" : "var(--gray-9)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "capitalize",
                fontFamily: "var(--font-mono)",
              }}
            >
              {s || "All"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "48px", color: "var(--gray-8)" }}>Loading...</div>
      ) : approvals.length === 0 ? (
        <div
          style={{
            border: "1px solid var(--gray-3)",
            borderRadius: "10px",
            padding: "64px",
            textAlign: "center",
          }}
        >
          <p style={{ color: "var(--gray-8)", fontSize: "15px", margin: "0 0 4px" }}>
            {statusFilter ? `No ${statusFilter} approvals found.` : "No approvals yet."}
          </p>
          <p style={{ color: "var(--gray-6)", fontSize: "13px", margin: 0 }}>
            Use your API key to send your first approval request.
          </p>
        </div>
      ) : (
        <div style={{ border: "1px solid var(--gray-3)", borderRadius: "10px", overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Action</th>
                <th>Summary</th>
                <th>Status</th>
                <th>Recipient</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {approvals.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontSize: "13px", fontWeight: 500, color: "var(--gray-12)" }}>{a.agentName}</td>
                  <td>
                    <code style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--accent-dim)" }}>
                      {a.action}
                    </code>
                  </td>
                  <td style={{ maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.summary}
                  </td>
                  <td>
                    <span className={`badge badge-${a.status}`}>{a.status}</span>
                  </td>
                  <td style={{ fontSize: "13px" }}>{a.recipient}</td>
                  <td style={{ fontSize: "13px" }}>{new Date(a.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
