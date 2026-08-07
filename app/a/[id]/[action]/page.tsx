"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export default function ApprovalDecision({ params, searchParams }: {
  params: { id: string; action: string };
  searchParams: { t?: string };
}) {
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
      const res = await fetch(`${API_URL}/v1/approvals/${params.id}`, {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_DEV_KEY || "appr_dev_devkey"}` },
      });
      if (!res.ok) { setState("error"); return; }
      setApproval(await res.json());
      setState("ready");
    } catch { setState("error"); }
  }

  async function decide(approve: boolean) {
    setState("submitting");
    try {
      const res = await fetch(`${API_URL}/v1/approvals/${params.id}/${approve ? "approve" : "reject"}?t=${searchParams.t}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(approve ? {} : { reason }),
      });
      const data = await res.json();
      if (res.ok) { setResult(approve ? "approved" : "rejected"); setState("done"); }
      else { setResult(data?.error?.message || "Something went wrong"); setState("error"); }
    } catch { setResult("Network error"); setState("error"); }
  }

  if (state === "loading") return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>Loading…</div>;
  if (state === "error") return <Center><h1>Something went wrong</h1><p style={{ color: "var(--muted)" }}>{result || "This approval link may be invalid or expired."}</p></Center>;
  if (state === "done") return <Center>
    <div style={{ fontSize: "48px", marginBottom: "16px" }}>{result === "approved" ? "✓" : "✗"}</div>
    <h1>{result === "approved" ? "Approved" : "Rejected"}</h1>
    <p style={{ color: "var(--muted)" }}>{result === "approved" ? "The agent has been notified and will proceed." : "The agent has been notified and will not proceed."}</p>
  </Center>;
  if (!approval || approval.status !== "pending") return <Center><h1>This approval has already been {approval?.status || "decided"}</h1><p style={{ color: "var(--muted)" }}>No further action is needed.</p></Center>;

  const isReject = params.action === "reject";

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px" }}>
      <div style={{ maxWidth: "520px", width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "40px" }}>
        <p style={{ margin: "0 0 8px", fontSize: "13px", textTransform: "uppercase", color: "var(--dim)", letterSpacing: "0.05em" }}>{isReject ? "Reject approval" : "Approval request"}</p>
        <h1 style={{ margin: "0 0 8px", fontSize: "22px", fontWeight: 700 }}>{approval.agent_name}</h1>
        <p style={{ margin: "0 0 24px", fontSize: "15px", color: "var(--muted)", lineHeight: 1.5 }}>{approval.summary}</p>
        {approval.details && Object.keys(approval.details).length > 0 && (
          <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "8px", padding: "16px", marginBottom: "24px" }}>
            <p style={{ margin: "0 0 8px", fontSize: "12px", textTransform: "uppercase", color: "var(--dim)" }}>Details</p>
            <pre style={{ margin: 0, fontSize: "13px", color: "var(--muted)", whiteSpace: "pre-wrap", overflowWrap: "break-word" }}>{JSON.stringify(approval.details, null, 2)}</pre>
          </div>
        )}
        {isReject && <input placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: "100%", padding: "12px 16px", marginBottom: "16px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text)", fontSize: "14px", outline: "none" }} />}
        {state === "submitting" ? <div style={{ textAlign: "center", color: "var(--muted)" }}>Submitting…</div> : isReject ? (
          <button onClick={() => decide(false)} style={{ width: "100%", padding: "14px", border: "none", borderRadius: "8px", background: "var(--red)", color: "#fff", fontSize: "16px", fontWeight: 600, cursor: "pointer" }}>Confirm rejection</button>
        ) : (
          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={() => decide(true)} style={{ flex: 1, padding: "14px", border: "none", borderRadius: "8px", background: "var(--blue)", color: "#fff", fontSize: "16px", fontWeight: 600, cursor: "pointer" }}>✓ Approve</button>
            <a href={`/a/${approval.id}/reject?t=${searchParams.t}`} style={{ flex: 1, textAlign: "center", padding: "14px", borderRadius: "8px", border: "1px solid var(--red)", color: "var(--red)", fontSize: "16px", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>✗ Reject</a>
          </div>
        )}
        <p style={{ margin: "20px 0 0", fontSize: "12px", color: "var(--dim)", textAlign: "center" }}>Expires {new Date(approval.expires_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</p>
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px" }}>{children}</div>;
}