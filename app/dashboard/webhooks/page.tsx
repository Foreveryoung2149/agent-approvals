"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newSecret, setNewSecret] = useState("");

  useEffect(() => {
    loadWebhooks();
  }, []);

  async function loadWebhooks() {
    try {
      const res = await apiFetch("/v1/webhooks");
      if (res.ok) setWebhooks((await res.json()).webhooks || []);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }

  async function createWebhook() {
    setError("");
    setNewSecret("");
    try {
      const r = await apiFetch("/v1/webhooks", {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      const d = await r.json();
      if (r.ok) {
        setNewSecret(d.webhook?.secret || d.secret || "");
        setUrl("");
        loadWebhooks();
      } else {
        setError(d?.error?.message || "Error");
      }
    } catch {
      setError("Network error");
    }
  }

  async function deleteWebhook(id: string) {
    if (!confirm("Delete this webhook?")) return;
    await apiFetch(`/v1/webhooks/${id}`, { method: "DELETE" });
    loadWebhooks();
  }

  if (loading) {
    return <div style={{ textAlign: "center", padding: "48px", color: "var(--gray-8)" }}>Loading...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--gray-12)", margin: "0 0 6px" }}>
          Webhooks
        </h1>
        <p style={{ color: "var(--gray-8)", fontSize: "14px", margin: 0 }}>
          Receive real-time notifications when approvals are decided.
        </p>
      </div>

      {error && <div className="alert-error" style={{ marginBottom: "20px" }}>{error}</div>}

      {newSecret && (
        <div className="alert-success" style={{ marginBottom: "20px" }}>
          <p style={{ margin: "0 0 8px", fontWeight: 600 }}>Webhook signing secret (save it now):</p>
          <code style={{ display: "block", padding: "10px 14px", background: "var(--gray-1)", borderRadius: "6px", fontSize: "13px", fontFamily: "var(--font-mono)", color: "var(--gray-12)" }}>
            {newSecret}
          </code>
        </div>
      )}

      {/* Create webhook */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "28px" }}>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="input"
          style={{ flex: 1, padding: "10px 14px", fontSize: "14px" }}
          placeholder="https://your-server.com/webhooks/nodsend"
        />
        <button onClick={createWebhook} className="btn-primary" style={{ minHeight: "42px", fontSize: "14px", padding: "0 20px" }}>
          Add webhook
        </button>
      </div>

      {webhooks.length === 0 ? (
        <div style={{ border: "1px solid var(--gray-3)", borderRadius: "10px", padding: "64px", textAlign: "center" }}>
          <p style={{ color: "var(--gray-8)", fontSize: "15px", margin: "0 0 4px" }}>No webhooks configured.</p>
          <p style={{ color: "var(--gray-6)", fontSize: "13px", margin: 0 }}>
            Add a webhook URL to receive approval.approved, approval.rejected, and approval.expired events.
          </p>
        </div>
      ) : (
        <div style={{ border: "1px solid var(--gray-3)", borderRadius: "10px", overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>URL</th>
                <th>Events</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map((w: any) => (
                <tr key={w.id}>
                  <td>
                    <code style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--gray-11)" }}>
                      {w.url}
                    </code>
                  </td>
                  <td style={{ fontSize: "12px", color: "var(--gray-8)" }}>
                    {(w.events || []).join(", ")}
                  </td>
                  <td>
                    <span className={`badge ${w.active ? "badge-approved" : "badge-expired"}`}>
                      {w.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      onClick={() => deleteWebhook(w.id)}
                      style={{
                        background: "none",
                        border: "1px solid rgba(248, 113, 113, 0.2)",
                        borderRadius: "6px",
                        color: "var(--error)",
                        fontSize: "12px",
                        fontWeight: 600,
                        padding: "4px 12px",
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
