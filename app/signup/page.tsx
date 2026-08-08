"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, setSessionToken } from "../lib/api";
import Navbar from "../components/Navbar";

export default function SignupPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await apiFetch("/v1/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, name: name || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error?.message || "Something went wrong");
        setLoading(false);
        return;
      }

      if (data.requireVerification) {
        setStep(2);
      } else if (data.token) {
        setSessionToken(data.token);
        router.push("/dashboard");
      }
    } catch {
      setError("Network error — is the API server running?");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResendMessage("");
    setLoading(true);

    try {
      const res = await apiFetch("/v1/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error?.message || "Invalid or expired code");
        setLoading(false);
        return;
      }

      if (data.token) {
        setSessionToken(data.token);
        router.push("/dashboard");
      }
    } catch {
      setError("Network error");
      setLoading(false);
    }
  }

  async function handleResend() {
    setResendMessage("");
    setError("");
    try {
      await apiFetch("/v1/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setResendMessage("A new code has been sent.");
    } catch {
      setError("Network error");
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
              {step === 1 ? "Create your account" : "Verify your email"}
            </h1>
            <p style={{ color: "var(--gray-9)", fontSize: "14px", margin: 0, lineHeight: 1.5 }}>
              {step === 1
                ? "Free forever. 100 approvals/month included."
                : <>We sent a 6-digit code to <strong style={{color:"var(--gray-12)"}}>{email}</strong></>}
            </p>
          </div>

          {error && <div className="alert-error" style={{ marginBottom: "20px" }}>{error}</div>}
          {resendMessage && <div className="alert-success" style={{ marginBottom: "20px" }}>{resendMessage}</div>}

          {step === 1 && (
            <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div>
                <label className="label">Name <span style={{ color: "var(--gray-6)" }}>(optional)</span></label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  placeholder="Your name"
                />
              </div>
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
                <label className="label">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                  marginTop: "4px",
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Creating account..." : "Continue"}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div>
                <label className="label">Verification code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  className="input"
                  placeholder="000000"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "20px",
                    letterSpacing: "0.2em",
                    textAlign: "center",
                  }}
                  maxLength={6}
                />
              </div>
              
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="btn-primary"
                style={{
                  width: "100%",
                  minHeight: "48px",
                  fontSize: "15px",
                  marginTop: "4px",
                  opacity: (loading || code.length !== 6) ? 0.7 : 1,
                  cursor: (loading || code.length !== 6) ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Verifying..." : "Verify email"}
              </button>

              <div style={{ textAlign: "center", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={handleResend}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--gray-8)",
                    fontSize: "13px",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Didn't receive a code? Resend
                </button>
              </div>
            </form>
          )}

          {step === 1 && (
            <p
              style={{
                marginTop: "28px",
                textAlign: "center",
                color: "var(--gray-8)",
                fontSize: "14px",
              }}
            >
              Already have an account?{" "}
              <Link href="/login" style={{ color: "var(--accent)", fontWeight: 600 }}>
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}