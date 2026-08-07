import Link from "next/link";

export const metadata = {
  title: "Docs — Agent Approvals",
  description: "API reference for Agent Approvals — create approval requests, check status, approve/reject, webhooks.",
};

export default function DocsPage() {
  return (
    <div style={{ minHeight: "100vh" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 32px", borderBottom: "1px solid var(--border)" }}>
        <Link href="/" style={{ fontWeight: 700, fontSize: "18px", color: "var(--text)" }}>Agent Approvals</Link>
        <Link href="/signup" style={{ background: "var(--blue)", color: "#fff", padding: "8px 16px", borderRadius: "8px", fontSize: "14px", fontWeight: 600 }}>Get a key</Link>
      </nav>

      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "48px 32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: 800, marginBottom: "8px" }}>API Reference</h1>
        <p style={{ color: "var(--muted)", fontSize: "16px", marginBottom: "40px" }}>
          Base URL: <code style={{ background: "var(--surface)", padding: "2px 6px", borderRadius: "4px" }}>https://api.agentapprovals.dev</code>
          {" — Auth: Bearer token (API key prefixed with appr_live_…)"}
        </p>

        <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "12px" }}>Create an approval</h2>
        <p style={{ color: "var(--muted)", marginBottom: "16px" }}>Your agent calls this when it wants to do something that needs human sign-off.</p>
        <pre style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "16px", fontSize: "13px", overflow: "auto", marginBottom: "24px", color: "var(--muted)" }}>
{`POST /v1/approvals
Authorization: Bearer appr_live_...
Content-Type: application/json

{
  "action": "book_flight",
  "summary": "Book SFO→JFK for $350 on United, departing Aug 15",
  "details": { "price": 350, "airline": "United" },
  "channel": "email",
  "recipient": "founder@company.com",
  "expires_in": "1h",
  "webhook_url": "https://your-agent.com/webhooks"
}`}
        </pre>

        <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "12px" }}>Response</h2>
        <pre style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "16px", fontSize: "13px", overflow: "auto", marginBottom: "24px", color: "var(--muted)" }}>
{`{
  "id": "clk...",
  "status": "pending",
  "action": "book_flight",
  "summary": "Book SFO→JFK for $350...",
  "channel": "email",
  "recipient": "founder@company.com",
  "expires_at": "2026-08-07T20:00:00.000Z",
  "created_at": "2026-08-07T19:00:00.000Z",
  "approve_url": "https://agentapprovals.dev/a/clk.../approve?t=...",
  "reject_url": "https://agentapprovals.dev/a/clk.../reject?t=..."
}`}
        </pre>

        <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "12px" }}>Webhook payload</h2>
        <p style={{ color: "var(--muted)", marginBottom: "16px" }}>When the human decides, we POST this to your webhook_url. Verify the HMAC-SHA256 signature.</p>
        <pre style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "16px", fontSize: "13px", overflow: "auto", marginBottom: "24px", color: "var(--muted)" }}>
{`Headers:
  Approval-Signature: t=<timestamp>,v1=<hex-signature>
  Approval-Event: approval.approved

Body:
{
  "event_id": "evt_...",
  "event_type": "approval.approved",
  "created_at": "2026-08-07T19:05:00.000Z",
  "approval": {
    "id": "clk...",
    "agent_name": "booking-agent",
    "action": "book_flight",
    "summary": "Book SFO→JFK for $350...",
    "status": "approved",
    "decided_by": "founder@company.com",
    "decided_at": "2026-08-07T19:05:00.000Z"
  }
}`}
        </pre>

        <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "12px" }}>All endpoints</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <tbody>
            {endpoints.map((e) => (
              <tr key={e.method + e.path} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "12px 0", width: "80px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, padding: "2px 8px", borderRadius: "4px", background: methodColor(e.method) }}>{e.method}</span>
                </td>
                <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "13px" }}>{e.path}</td>
                <td style={{ padding: "12px 16px", color: "var(--muted)" }}>{e.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const endpoints = [
  { method: "POST", path: "/v1/approvals", desc: "Create an approval request" },
  { method: "GET", path: "/v1/approvals/:id", desc: "Get approval status" },
  { method: "GET", path: "/v1/approvals", desc: "List approvals" },
  { method: "POST", path: "/v1/approvals/:id/approve", desc: "Approve (signed link or API)" },
  { method: "POST", path: "/v1/approvals/:id/reject", desc: "Reject (signed link or API)" },
  { method: "POST", path: "/v1/approvals/:id/cancel", desc: "Agent cancels request" },
  { method: "GET", path: "/v1/approvals/:id/logs", desc: "Audit trail" },
];

function methodColor(m: string) {
  return m === "POST" ? "var(--blue)" : m === "GET" ? "var(--green)" : "var(--dim)";
}