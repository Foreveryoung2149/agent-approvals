"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

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
  created_at: string;
}

export default function DashboardPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [newKey, setNewKey] = useState("");
  const [newKeyName, setNewKeyName] = useState("Default key");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const [k, a] = await Promise.all([
        apiFetch("/v1/api-keys"),
        apiFetch("/v1/approvals?limit=10"),
      ]);
      if (k.ok) setKeys((await k.json()).keys || []);
      if (a.ok) setApprovals((await a.json()).approvals || []);
      setLoading(false);
    } catch {
      setError("Failed to load dashboard data");
      setLoading(false);
    }
  }

  async function createKey() {
    try {
      const r = await apiFetch("/v1/api-keys", {
        method: "POST",
        body: JSON.stringify({ name: newKeyName }),
      });
      const d = await r.json();
      if (r.ok) {
        setNewKey(d.key);
        loadDashboard();
      } else {
        setError(d?.error?.message || "Error creating key");
      }
    } catch {
      setError("Network error");
    }
  }

  const pending = approvals.filter((a) => a.status === "pending").length;
  const approved = approvals.filter((a) => a.status === "approved").length;
  const rejected = approvals.filter((a) => a.status === "rejected").length;

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh", color: "var(--gray-8)" }}>
        Loading...
      </div>
    );
  }

  return (
    <div>
      <h1
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "24px",
          fontWeight: 700,
          color: "var(--gray-12)",
          margin: "0 0 32px",
        }}
      >
        Overview
      </h1>

      {error && <div className="alert-error" style={{ marginBottom: "20px" }}>{error}</div>}

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
          marginBottom: "40px",
        }}
      >
        <div className="stat-card">
          <div className="stat-label">Total Approvals</div>
          <div className="stat-value">{approvals.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending</div>
          <div className="stat-value" style={{ color: "var(--warning)" }}>{pending}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Approved</div>
          <div className="stat-value" style={{ color: "var(--success)" }}>{approved}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Rejected</div>
          <div className="stat-value" style={{ color: "var(--error)" }}>{rejected}</div>
        </div>
      </div>

      {/* API Keys section */}
      <section style={{ marginBottom: "48px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "17px", fontWeight: 700, color: "var(--gray-12)", margin: 0 }}>
            API Keys
          </h2>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="input"
              style={{ width: "180px", padding: "8px 12px", fontSize: "13px" }}
              placeholder="Key name"
            />
            <button onClick={createKey} className="btn-primary" style={{ minHeight: "36px", fontSize: "13px", padding: "0 16px" }}>
              Create key
            </button>
          </div>
        </div>

        {newKey && (
          <div className="alert-success" style={{ marginBottom: "16px" }}>
            <p style={{ margin: "0 0 8px", fontWeight: 600 }}>Save this key — it&apos;s shown only once:</p>
            <code
              style={{
                display: "block",
                padding: "10px 14px",
                background: "var(--gray-1)",
                borderRadius: "6px",
                fontSize: "13px",
                fontFamily: "var(--font-mono)",
                color: "var(--gray-12)",
                overflowX: "auto",
              }}
            >
              {newKey}
            </code>
          </div>
        )}

        {keys.length === 0 ? (
          <p style={{ color: "var(--gray-8)", fontSize: "14px" }}>
            No API keys yet. Create one to start sending approval requests.
          </p>
        ) : (
          <div style={{ border: "1px solid var(--gray-3)", borderRadius: "10px", overflow: "hidden" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Key</th>
                  <th>Last Used</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k: any) => (
                  <tr key={k.id}>
                    <td style={{ color: "var(--gray-12)", fontWeight: 500 }}>{k.name}</td>
                    <td>
                      <code style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--gray-8)" }}>
                        {k.key_prefix}...
                      </code>
                    </td>
                    <td style={{ fontSize: "13px" }}>
                      {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent Approvals */}
      <section>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "17px", fontWeight: 700, color: "var(--gray-12)", margin: 0 }}>
            Recent Approvals
          </h2>
          <Link href="/dashboard/approvals" style={{ fontSize: "13px", color: "var(--accent)", fontWeight: 600 }}>
            View all →
          </Link>
        </div>

        {approvals.length === 0 ? (
          <div
            style={{
              border: "1px solid var(--gray-3)",
              borderRadius: "10px",
              padding: "48px",
              textAlign: "center",
            }}
          >
            <p style={{ color: "var(--gray-8)", fontSize: "14px", margin: "0 0 4px" }}>
              No approvals yet.
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
                  <th>Action</th>
                  <th>Summary</th>
                  <th>Status</th>
                  <th>Channel</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {approvals.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <code style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--accent-dim)" }}>
                        {a.action}
                      </code>
                    </td>
                    <td style={{ maxWidth: "280px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.summary}
                    </td>
                    <td>
                      <span className={`badge badge-${a.status}`}>
                        {a.status}
                      </span>
                    </td>
                    <td style={{ textTransform: "capitalize", fontSize: "13px" }}>{a.channel}</td>
                    <td style={{ fontSize: "13px" }}>{new Date(a.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}