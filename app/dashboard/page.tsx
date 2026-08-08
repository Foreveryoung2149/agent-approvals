"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getSessionToken, clearSessionToken } from "../lib/api";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [keys, setKeys] = useState<any[]>([]);
  const [newKey, setNewKey] = useState("");
  const [newKeyName, setNewKeyName] = useState("Default key");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => { if (!getSessionToken()) router.push("/login"); else loadDashboard(); }, []);

  async function loadDashboard() {
    try {
      const [me, k, a] = await Promise.all([apiFetch("/v1/auth/me"), apiFetch("/v1/api-keys"), apiFetch("/v1/approvals?limit=10")]);
      if (me.ok) setUser((await me.json()).user);
      if (k.ok) setKeys((await k.json()).keys || []);
      setLoading(false);
    } catch { setError("Failed to load"); setLoading(false); }
  }

  async function createKey() {
    try {
      const r = await apiFetch("/v1/api-keys", { method: "POST", body: JSON.stringify({ name: newKeyName }) });
      const d = await r.json();
      if (r.ok) { setNewKey(d.key); loadDashboard(); } else setError(d?.error?.message || "Error");
    } catch { setError("Network error"); }
  }

  function logout() { clearSessionToken(); router.push("/"); }
  if (loading) return <Center>Loading...</Center>;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <nav style={{ display: "flex", justifyContent: "space-between", padding: "20px 32px", borderBottom: "1px solid var(--border)" }}>
        <Link href="/" style={{ fontWeight: 700, fontSize: "18px", color: "var(--text)" }}>Agent Approvals</Link>
        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          <Link href="/docs" style={{ color: "var(--muted)", fontSize: "14px" }}>Docs</Link>
          <span style={{ color: "var(--dim)", fontSize: "14px" }}>{user?.email}</span>
          <button onClick={logout} style={{ color: "var(--muted)", fontSize: "14px", background: "none", border: "none", cursor: "pointer" }}>Log out</button>
        </div>
      </nav>
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "48px 32px", flex: 1 }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "32px" }}>Dashboard</h1>
        {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid var(--red)", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", color: "var(--red)", fontSize: "14px" }}>{error}</div>}

        <section style={{ marginBottom: "48px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 600 }}>API Keys</h2>
            <div style={{ display: "flex", gap: "8px" }}>
              <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} style={{ padding: "8px 12px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "6px", color: "var(--text)", fontSize: "14px", outline: "none", width: "180px" }} placeholder="Key name" />
              <button onClick={createKey} style={{ padding: "8px 16px", background: "var(--blue)", color: "#fff", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>Create key</button>
            </div>
          </div>
          {newKey && <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid var(--green)", borderRadius: "8px", padding: "16px", marginBottom: "16px" }}><p style={{ margin: "0 0 8px", fontSize: "14px", color: "var(--green)", fontWeight: 600 }}>Save this key — shown once:</p><code style={{ fontSize: "13px", color: "var(--text)", background: "var(--bg)", padding: "8px 12px", borderRadius: "4px", display: "block", overflowX: "auto" }}>{newKey}</code></div>}
          {keys.length === 0 ? <p style={{ color: "var(--dim)" }}>No API keys yet.</p> : <Table keys={keys} />}
        </section>
      </div>
    </div>
  );
}

function Table({ keys }: { keys: any[] }) {
  return <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
      <thead><tr style={{ borderBottom: "1px solid var(--border)" }}><th style={{ padding: "12px 16px", textAlign: "left", color: "var(--dim)", fontWeight: 500, fontSize: "12px" }}>NAME</th><th style={{ padding: "12px 16px", textAlign: "left", color: "var(--dim)", fontWeight: 500, fontSize: "12px" }}>KEY</th><th style={{ padding: "12px 16px", textAlign: "left", color: "var(--dim)", fontWeight: 500, fontSize: "12px" }}>PLAN</th><th style={{ padding: "12px 16px", textAlign: "left", color: "var(--dim)", fontWeight: 500, fontSize: "12px" }}>LAST USED</th></tr></thead>
      <tbody>{keys.map((k: any) => <tr key={k.id} style={{ borderBottom: "1px solid var(--border)" }}><td style={{ padding: "12px 16px" }}>{k.name}</td><td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "13px", color: "var(--muted)" }}>{k.key_prefix}</td><td style={{ padding: "12px 16px" }}>{k.plan}</td><td style={{ padding: "12px 16px", color: "var(--dim)" }}>{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "Never"}</td></tr>)}</tbody>
    </table>
  </div>;
}

function Center({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>{children}</div>;
}