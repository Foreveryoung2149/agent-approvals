"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, setSessionToken } from "../lib/api";
import Navbar from "../components/Navbar";

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
    } catch {
      setError("Network error — is the API server running?");
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
        }}
      >
        <div className="auth-card">
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <span
              style={{
                display: "inline-grid",
                width: "40px",
                height: "40px",
                placeItems: "center",
                borderRadius: "10px",
                background: "var(--accent)",
                color: "#050505",
                fontSize: "18px",
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                marginBottom: "20px",
              }}
            >
              N
            </span>
            <h1
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "24px",
                fontWeight: 700,
                color: "var(--gray-12)",
                margin: "0 0 8px",
              }}
            >
              Welcome back
            </h1>
            <p style={{ color: "var(--gray-9)", fontSize: "14px", margin: 0 }}>
              Sign in to manage your approvals and API keys.
            </p>
          </div>

          {error && <div className="alert-error" style={{ marginBottom: "20px" }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label className="label" style={{ marginBottom: 0 }}>Password</label>
                <Link
                  href="/forgot-password"
                  style={{
                    fontSize: "13px",
                    color: "var(--accent)",
                    fontWeight: 500,
                  }}
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input"
                style={{ marginTop: "6px" }}
                placeholder="Your password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: "100%",
                minHeight: "48px",
                fontSize: "15px",
                marginTop: "4px",
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p
            style={{
              marginTop: "28px",
              textAlign: "center",
              color: "var(--gray-8)",
              fontSize: "14px",
            }}
          >
            New here?{" "}
            <Link href="/signup" style={{ color: "var(--accent)", fontWeight: 600 }}>
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}