"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiFetch("/v1/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setUser(d.user);
          setName(d.user.name || "");
        }
      });
  }, []);

  if (!user) {
    return <div style={{ textAlign: "center", padding: "48px", color: "var(--gray-8)" }}>Loading...</div>;
  }

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--gray-12)", margin: "0 0 32px" }}>
        Settings
      </h1>

      {message && <div className="alert-success" style={{ marginBottom: "20px" }}>{message}</div>}

      {/* Profile */}
      <section style={{ marginBottom: "48px" }}>
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "17px", fontWeight: 700, color: "var(--gray-12)", margin: "0 0 20px" }}>
          Profile
        </h2>
        <div
          style={{
            border: "1px solid var(--gray-3)",
            borderRadius: "10px",
            padding: "24px",
            background: "var(--gray-2)",
          }}
        >
          <div style={{ display: "grid", gap: "18px", maxWidth: "400px" }}>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={user.email}
                disabled
                className="input"
                style={{ opacity: 0.6, cursor: "not-allowed" }}
              />
            </div>
            <div>
              <label className="label">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="Your name"
              />
            </div>
            <button
              onClick={async () => {
                setSaving(true);
                setMessage("");
                // Future: PATCH /v1/auth/me to update profile
                setTimeout(() => {
                  setMessage("Profile updated (coming soon)");
                  setSaving(false);
                }, 500);
              }}
              disabled={saving}
              className="btn-primary"
              style={{ width: "fit-content", minHeight: "38px", fontSize: "13px" }}
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </section>

      {/* Security */}
      <section style={{ marginBottom: "48px" }}>
        <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "17px", fontWeight: 700, color: "var(--gray-12)", margin: "0 0 20px" }}>
          Security
        </h2>
        <div
          style={{
            border: "1px solid var(--gray-3)",
            borderRadius: "10px",
            padding: "24px",
            background: "var(--gray-2)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--gray-12)", marginBottom: "4px" }}>
                Two-factor authentication
              </div>
              <div style={{ fontSize: "13px", color: "var(--gray-8)" }}>
                {user.twoFactorEnabled
                  ? "2FA is enabled on your account."
                  : "Add an extra layer of security to your account."}
              </div>
            </div>
            <span
              className={`badge ${user.twoFactorEnabled ? "badge-approved" : "badge-expired"}`}
            >
              {user.twoFactorEnabled ? "Enabled" : "Disabled"}
            </span>
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
    </div>
  );
}
