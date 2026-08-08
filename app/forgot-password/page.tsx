"use client";

import Link from "next/link";
import { useState } from "react";
import { apiFetch } from "../lib/api";
import Navbar from "../components/Navbar";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"request" | "reset" | "done">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await apiFetch("/v1/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data?.error?.message || "Something went wrong");
        setLoading(false);
        return;
      }

      setStep("reset");
      setLoading(false);
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await apiFetch("/v1/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, code, newPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data?.error?.message || "Invalid code or password");
        setLoading(false);
        return;
      }

      setStep("done");
      setLoading(false);
    } catch {
      setError("Network error");
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
              {step === "done" ? "Password updated" : "Reset your password"}
            </h1>
            <p style={{ color: "var(--gray-9)", fontSize: "14px", margin: 0 }}>
              {step === "request" && "Enter your email and we'll send a reset code."}
              {step === "reset" && `We sent a code to ${email}. Enter it below.`}
              {step === "done" && "Your password has been updated successfully."}
            </p>
          </div>

          {error && <div className="alert-error" style={{ marginBottom: "20px" }}>{error}</div>}

          {step === "request" && (
            <form onSubmit={handleRequest} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
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
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{
                  width: "100%",
                  minHeight: "48px",
                  fontSize: "15px",
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Sending..." : "Send reset code"}
              </button>
            </form>
          )}

          {step === "reset" && (
            <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div>
                <label className="label">Reset code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  className="input"
                  placeholder="6-digit code"
                  maxLength={6}
                  style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.15em", textAlign: "center", fontSize: "20px" }}
                />
              </div>
              <div>
                <label className="label">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="input"
                  placeholder="Min 8 characters"
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
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Resetting..." : "Reset password"}
              </button>
            </form>
          )}

          {step === "done" && (
            <Link
              href="/login"
              className="btn-primary"
              style={{
                width: "100%",
                minHeight: "48px",
                fontSize: "15px",
                textAlign: "center",
              }}
            >
              Sign in with new password
            </Link>
          )}

          <p
            style={{
              marginTop: "28px",
              textAlign: "center",
              color: "var(--gray-8)",
              fontSize: "14px",
            }}
          >
            Remember your password?{" "}
            <Link href="/login" style={{ color: "var(--accent)", fontWeight: 600 }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
