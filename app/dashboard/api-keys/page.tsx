"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [newKey, setNewKey] = useState("");
  const [newKeyName, setNewKeyName] = useState("Default key");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    try {
      const res = await apiFetch("/v1/api-keys");
      if (res.ok) setKeys((await res.json()).keys || []);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }

  async function createKey() {
    setError("");
    try {
      const r = await apiFetch("/v1/api-keys", {
        method: "POST",
        body: JSON.stringify({ name: newKeyName }),
      });
      const d = await r.json();
      if (r.ok) {
        setNewKey(d.key);
        setNewKeyName("Default key");
        loadKeys();
      } else {
        setError(d?.error?.message || "Error");
      }
    } catch {
      setError("Network error");
    }
  }

  async function revokeKey(id: string) {
    if (!confirm("Revoke this key? This action cannot be undone.")) return;
    try {
      await apiFetch(`/v1/api-keys/${id}`, { method: "DELETE" });
      loadKeys();
    } catch {
      setError("Failed to revoke key");
    }
  }

  if (loading) {
    return <div style={{ textAlign: "center", padding: "48px", color: "var(--gray-8)" }}>Loading...</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--gray-12)", margin: "0 0 6px" }}>
            API Keys
          </h1>
          <p style={{ color: "var(--gray-8)", fontSize: "14px", margin: 0 }}>
            Manage your API keys for authentication.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="input"
            style={{ width: "200px", padding: "8px 12px", fontSize: "13px" }}
            placeholder="Key name"
          />
          <button onClick={createKey} className="btn-primary" style={{ minHeight: "38px", fontSize: "13px", padding: "0 18px" }}>
            Create key
          </button>
        </div>
      </div>

      {error && <div className="alert-error" style={{ marginBottom: "20px" }}>{error}</div>}

      {newKey && (
        <div className="alert-success" style={{ marginBottom: "20px" }}>
          <p style={{ margin: "0 0 8px", fontWeight: 600 }}>
            ⚠️ Save this key now — it won&apos;t be shown again:
          </p>
          <code
            style={{
              display: "block",
              padding: "12px 16px",
              background: "var(--gray-1)",
              borderRadius: "8px",
              fontSize: "13px",
              fontFamily: "var(--font-mono)",
              color: "var(--gray-12)",
              overflowX: "auto",
              wordBreak: "break-all",
            }}
          >
            {newKey}
          </code>
        </div>
      )}

      {keys.length === 0 ? (
        <div
          style={{
            border: "1px solid var(--gray-3)",
            borderRadius: "10px",
            padding: "64px",
            textAlign: "center",
          }}
        >
          <p style={{ color: "var(--gray-8)", fontSize: "15px", margin: "0 0 4px" }}>No API keys yet.</p>
          <p style={{ color: "var(--gray-6)", fontSize: "13px", margin: 0 }}>
            Create one to start sending approval requests.
          </p>
        </div>
      ) : (
        <div style={{ border: "1px solid var(--gray-3)", borderRadius: "10px", overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Key Prefix</th>
                <th>Created</th>
                <th>Last Used</th>
                <th style={{ textAlign: "right" }}>Actions</th>
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
                  <td style={{ fontSize: "13px" }}>{new Date(k.created_at).toLocaleDateString()}</td>
                  <td style={{ fontSize: "13px" }}>
                    {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "Never"}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {!k.revoked_at && (
                      <button
                        onClick={() => revokeKey(k.id)}
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
                        Revoke
                      </button>
                    )}
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
