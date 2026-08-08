"use client";

import Link from "next/link";
import { useState, use } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export default function ApprovalDecision({ params, searchParams }: {
  params: Promise<{ id: string; action: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id, action } = use(params);
  const { t } = use(searchParams);
  const [state, setState] = useState<"loading" | "ready" | "submitting" | "done" | "error">("loading");
  const [approval, setApproval] = useState<any>(null);
  const [result, setResult] = useState("");
  const [reason, setReason] = useState("");
  const [fetched, setFetched] = useState(false);

  if (!fetched) {
    setFetched(true);
    fetchApproval();
  }

  async function fetchApproval() {
    try {
      const res = await fetch(`${API_URL}/v1/approvals/${id}?t=${t}`, {
        headers: t ? {} : { Authorization: `Bearer ${process.env.NEXT_PUBLIC_DEV_KEY || "appr_dev_devkey"}` },
      });
      if (!res.ok) { setState("error"); return; }
      setApproval(await res.json());
      setState("ready");
    } catch { setState("error"); }
  }

  async function decide(approve: boolean) {
    setState("submitting");
    try {
      const res = await fetch(`${API_URL}/v1/approvals/${id}/${approve ? "approve" : "reject"}?t=${t}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(approve ? {} : { reason }),
      });
      const data = await res.json();
      if (res.ok) { setResult(approve ? "approved" : "rejected"); setState("done"); }
      else { setResult(data?.error?.message || "Something went wrong"); setState("error"); }
    } catch { setResult("Network error"); setState("error"); }
  }

  // ── Loading ──
  if (state === "loading") {
    return (
      <PageWrapper>
        <div style={{ color: "var(--gray-8)", fontSize: "15px" }}>Loading approval...</div>
      </PageWrapper>
    );
  }

  // ── Error ──
  if (state === "error") {
    return (
      <PageWrapper>
        <div className="auth-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "22px", fontWeight: 700, color: "var(--gray-12)", margin: "0 0 8px" }}>
            Something went wrong
          </h1>
          <p style={{ color: "var(--gray-8)", fontSize: "14px", margin: "0 0 24px" }}>
            {result || "This approval link may be invalid or expired."}
          </p>
          <Link href="/" className="btn-secondary" style={{ fontSize: "13px" }}>
            Go to Nodsend →
          </Link>
        </div>
      </PageWrapper>
    );
  }

  // ── Done ──
  if (state === "done") {
    const isApproved = result === "approved";
    return (
      <PageWrapper>
        <div className="auth-card" style={{ textAlign: "center" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              display: "inline-grid",
              placeItems: "center",
              fontSize: "28px",
              marginBottom: "20px",
              background: isApproved ? "rgba(74, 222, 128, 0.12)" : "rgba(248, 113, 113, 0.12)",
              border: `1px solid ${isApproved ? "rgba(74, 222, 128, 0.25)" : "rgba(248, 113, 113, 0.25)"}`,
            }}
          >
            {isApproved ? "✓" : "✗"}
          </div>
          <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: "var(--gray-12)", margin: "0 0 8px" }}>
            {isApproved ? "Approved" : "Rejected"}
          </h1>
          <p style={{ color: "var(--gray-8)", fontSize: "14px", margin: "0 0 24px", lineHeight: 1.6 }}>
            {isApproved
              ? "The agent has been notified and will proceed with the action."
              : "The agent has been notified and will not proceed."}
          </p>
          <Link href="/" style={{ fontSize: "13px", color: "var(--accent)", fontWeight: 600 }}>
            What is Nodsend? →
          </Link>
        </div>
      </PageWrapper>
    );
  }

  // ── Already decided ──
  if (!approval || approval.status !== "pending") {
    return (
      <PageWrapper>
        <div className="auth-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
          <h1 style={{ fontFamily: "var(--font-mono)", fontSize: "22px", fontWeight: 700, color: "var(--gray-12)", margin: "0 0 8px" }}>
            Already {approval?.status || "decided"}
          </h1>
          <p style={{ color: "var(--gray-8)", fontSize: "14px", margin: 0 }}>
            This approval has already been handled. No further action is needed.
          </p>
        </div>
      </PageWrapper>
    );
  }

  // ── Decision UI ──
  const isReject = action === "reject";

  return (
    <PageWrapper>
      <div className="auth-card" style={{ maxWidth: "520px" }}>
        {/* Header label */}
        <div
          className="eyebrow"
          style={{ marginBottom: "20px" }}
        >
          {isReject ? "Reject request" : "Approval request"}
        </div>

        {/* Agent + summary */}
        <h1
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "20px",
            fontWeight: 700,
            color: "var(--gray-12)",
            margin: "0 0 8px",
          }}
        >
          {approval.agent_name}
        </h1>
        <p style={{ fontSize: "15px", color: "var(--gray-9)", lineHeight: 1.6, margin: "0 0 24px" }}>
          {approval.summary}
        </p>

        {/* Details (if any) */}
        {approval.details && Object.keys(approval.details).length > 0 && (
          <div
            style={{
              background: "var(--gray-1)",
              border: "1px solid var(--gray-4)",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "24px",
            }}
          >
            <p
              style={{
                margin: "0 0 8px",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--gray-8)",
              }}
            >
              Details
            </p>
            <pre
              style={{
                margin: 0,
                fontSize: "13px",
                fontFamily: "var(--font-mono)",
                color: "var(--gray-11)",
                whiteSpace: "pre-wrap",
                overflowWrap: "break-word",
                lineHeight: 1.6,
              }}
            >
              {JSON.stringify(approval.details, null, 2)}
            </pre>
          </div>
        )}

        {/* Rejection reason input */}
        {isReject && (
          <input
            placeholder="Reason for rejection (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="input"
            style={{ marginBottom: "16px" }}
          />
        )}

        {/* Action buttons */}
        {state === "submitting" ? (
          <div style={{ textAlign: "center", padding: "14px", color: "var(--gray-8)" }}>
            Submitting...
          </div>
        ) : isReject ? (
          <button
            onClick={() => decide(false)}
            style={{
              width: "100%",
              padding: "14px",
              border: "none",
              borderRadius: "8px",
              background: "var(--error)",
              color: "#fff",
              fontSize: "15px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "opacity 150ms",
            }}
          >
            ✗ Confirm rejection
          </button>
        ) : (
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => decide(true)}
              className="btn-primary"
              style={{ flex: 1, minHeight: "48px", fontSize: "15px" }}
            >
              ✓ Approve
            </button>
            <a
              href={`/a/${approval.id}/reject?t=${t}`}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "14px",
                borderRadius: "8px",
                border: "1px solid rgba(248, 113, 113, 0.3)",
                color: "var(--error)",
                fontSize: "15px",
                fontWeight: 700,
                textDecoration: "none",
                transition: "background 150ms",
              }}
            >
              ✗ Reject
            </a>
          </div>
        )}

        {/* Expiry note */}
        <p style={{ margin: "20px 0 0", fontSize: "12px", color: "var(--gray-6)", textAlign: "center" }}>
          Expires {new Date(approval.expires_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
        </p>
      </div>
    </PageWrapper>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px",
        background: "var(--background)",
      }}
    >
      {/* Mini logo */}
      <div style={{ marginBottom: "24px" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              display: "grid",
              width: "24px",
              height: "24px",
              placeItems: "center",
              borderRadius: "6px",
              background: "var(--accent)",
              color: "#050505",
              fontSize: "12px",
              fontWeight: 800,
              fontFamily: "var(--font-mono)",
            }}
          >
            N
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "14px", color: "var(--gray-9)" }}>
            Nodsend
          </span>
        </Link>
      </div>
      {children}
    </div>
  );
}