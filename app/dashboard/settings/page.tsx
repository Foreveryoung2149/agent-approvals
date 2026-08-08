"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // 2FA state
  const [show2faModal, setShow2faModal] = useState(false);
  const [tfSecret, setTfSecret] = useState("");
  const [tfUri, setTfUri] = useState("");
  const [tfCode, setTfCode] = useState("");
  const [tfError, setTfError] = useState("");
  const [tfLoading, setTfLoading] = useState(false);

  useEffect(() => {
    fetchUser();
  }, []);

  async function fetchUser() {
    const r = await apiFetch("/v1/auth/me");
    const d = await r.json();
    if (d.user) {
      setUser(d.user);
      setName(d.user.name || "");
    }
  }

  async function start2faSetup() {
    setShow2faModal(true);
    setTfError("");
    setTfCode("");
    setTfSecret("");
    
    try {
      const res = await apiFetch("/v1/auth/2fa/generate", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setTfSecret(data.secret);
        setTfUri(data.uri);
      } else {
        setTfError("Failed to generate 2FA secret.");
      }
    } catch {
      setTfError("Network error.");
    }
  }

  async function confirm2fa(e: React.FormEvent) {
    e.preventDefault();
    setTfError("");
    setTfLoading(true);

    try {
      const res = await apiFetch("/v1/auth/2fa/enable", {
        method: "POST",
        body: JSON.stringify({ code: tfCode, secret: tfSecret }),
      });

      if (res.ok) {
        setShow2faModal(false);
        setMessage("Two-factor authentication enabled successfully.");
        fetchUser(); // Refresh user state to show badge
      } else {
        const data = await res.json();
        setTfError(data?.error?.message || "Invalid verification code.");
      }
    } catch {
      setTfError("Network error.");
    } finally {
      setTfLoading(false);
    }
  }

  if (!user) {
    return <div style={{ textAlign: "center", padding: "48px", color: "var(--gray-8)" }}>Loading...</div>;
  }

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--gray-12)", margin: "0 0 32px" }}>
        Settings
      </h1>

      <p style={{ color: "var(--gray-9)", fontSize: "14px", marginTop: "-24px", marginBottom: "32px" }}>
        Manage your account security.
      </p>

      {message && <div className="alert-success" style={{ marginBottom: "20px" }}>{message}</div>}

      {/* Security Section (matches Trace) */}
      <section style={{ marginBottom: "48px" }}>
        <div
          style={{
            border: "1px solid var(--gray-3)",
            borderRadius: "10px",
            background: "var(--gray-2)",
          }}
        >
          {/* Email Verification Row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px", borderBottom: "1px solid var(--gray-3)" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--gray-12)", marginBottom: "4px" }}>
                Email verification
              </div>
              <div style={{ fontSize: "13px", color: "var(--gray-8)" }}>
                {user.email}
              </div>
            </div>
            {user.email_verified ? (
              <span className="badge badge-approved">Verified</span>
            ) : (
              <span className="badge badge-expired">Unverified</span>
            )}
          </div>

          {/* 2FA Row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--gray-12)", marginBottom: "4px" }}>
                Two-factor authentication
              </div>
              <div style={{ fontSize: "13px", color: "var(--gray-8)" }}>
                Require a time-based 6-digit code from your authenticator app when logging in.
              </div>
            </div>
            {user.twoFactorEnabled ? (
              <span className="badge badge-approved">Enabled</span>
            ) : (
              <button
                onClick={start2faSetup}
                style={{
                  background: "var(--gray-4)",
                  border: "1px solid var(--gray-5)",
                  color: "var(--gray-12)",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Enable
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Plan info */}
      <section>
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "17px", fontWeight: 700, color: "var(--gray-12)", margin: "0 0 20px" }}>
          Plan
        </h2>
        <div
          style={{
            border: "1px solid var(--accent-border)",
            borderRadius: "10px",
            padding: "24px",
            background: "var(--gray-2)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--gray-12)", marginBottom: "4px" }}>
                Free Plan
              </div>
              <div style={{ fontSize: "13px", color: "var(--gray-8)" }}>
                100 approvals/month included. No credit card required.
              </div>
            </div>
            <span className="badge badge-approved">Active</span>
          </div>
        </div>
      </section>

      {/* 2FA Setup Modal */}
      {show2faModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: "var(--gray-2)",
              border: "1px solid var(--gray-3)",
              borderRadius: "12px",
              padding: "32px",
              width: "100%",
              maxWidth: "400px",
            }}
          >
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--gray-12)", margin: "0 0 8px" }}>
              Enable two-factor authentication
            </h2>
            <p style={{ fontSize: "14px", color: "var(--gray-9)", marginBottom: "24px", lineHeight: 1.5 }}>
              Scan the QR code with your authenticator app, then enter the 6-digit code to confirm.
            </p>

            {tfError && <div className="alert-error" style={{ marginBottom: "16px" }}>{tfError}</div>}

            {!tfSecret ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--gray-8)" }}>
                Generating...
              </div>
            ) : (
              <form onSubmit={confirm2fa}>
                <div
                  style={{
                    background: "white",
                    padding: "16px",
                    borderRadius: "12px",
                    display: "flex",
                    justifyContent: "center",
                    marginBottom: "16px",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(tfUri)}`}
                    alt="2FA QR Code"
                    width={200}
                    height={200}
                    style={{ display: "block" }}
                  />
                </div>
                
                <p style={{ fontSize: "13px", fontFamily: "var(--font-mono)", color: "var(--gray-8)", marginBottom: "24px", textAlign: "center" }}>
                  {tfSecret}
                </p>

                <div style={{ marginBottom: "24px" }}>
                  <label className="label">Verification code</label>
                  <input
                    type="text"
                    value={tfCode}
                    onChange={(e) => setTfCode(e.target.value)}
                    required
                    className="input"
                    placeholder="123456"
                    style={{ fontFamily: "var(--font-mono)", fontSize: "16px", letterSpacing: "0.1em" }}
                    maxLength={6}
                  />
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    type="submit"
                    disabled={tfLoading || tfCode.length !== 6}
                    className="btn-primary"
                    style={{ flex: 1, minHeight: "44px" }}
                  >
                    {tfLoading ? "Verifying..." : "Enable"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShow2faModal(false)}
                    style={{
                      background: "transparent",
                      border: "1px solid var(--gray-4)",
                      color: "var(--gray-11)",
                      padding: "0 24px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
