"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, setSessionToken } from "../lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await apiFetch("/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error?.message || "Invalid email or password");
        setLoading(false);
        return;
      }

      setSessionToken(data.token);
      router.push("/dashboard");
    } catch (err) {
      setError("Network error — is the API server running?");
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 32px", borderBottom: "1px solid var(--border)" }}>
        <Link href="/" style={{ fontWeight: 700, fontSize: "18px", color: "var(--text)" }}>Agent Approvals</Link>
        <Link href="/signup" style={{ color: "var(--muted)", fontSize: "14px" }}>Sign up</Link>
      </nav>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px" }}>
        <div style={{ maxWidth: "420px", width: "100%" }}>
          <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "8px" }}>Welcome back</h1>
          <p style={{ color: "var(--muted)", fontSize: "15px", marginBottom: "32px" }}>Log in to manage your API keys and approvals.</p>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid var(--red)", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", color: "var(--red)", fontSize: "14px" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "14px", color: "var(--muted)", marginBottom: "6px" }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: "100%", padding: "12px 16px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text)", fontSize: "15px", outline: "none" }}
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "14px", color: "var(--muted)", marginBottom: "6px" }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: "100%", padding: "12px 16px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text)", fontSize: "15px", outline: "none" }}
                placeholder="Your password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "14px", border: "none", borderRadius: "8px",
                background: "var(--blue)", color: "#fff", fontSize: "16px", fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          <p style={{ marginTop: "24px", textAlign: "center", color: "var(--dim)", fontSize: "14px" }}>
            New here? <Link href="/signup" style={{ color: "var(--blue)" }}>Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}