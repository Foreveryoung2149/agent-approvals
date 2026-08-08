import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export const metadata = {
  title: "Docs — Nodsend",
  description: "API reference for Nodsend — human-in-the-loop approval API for AI agents.",
};

export default function DocsPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />

      <div style={{ maxWidth: "780px", margin: "0 auto", padding: "56px 32px", flex: 1 }}>
        <h1
          className="heading-display"
          style={{ fontSize: "36px", color: "var(--gray-12)", margin: "0 0 8px" }}
        >
          API Reference
        </h1>
        <p style={{ color: "var(--gray-9)", fontSize: "16px", marginBottom: "48px" }}>
          Base URL:{" "}
          <code style={{ background: "var(--gray-3)", padding: "3px 8px", borderRadius: "4px", fontFamily: "var(--font-mono)", fontSize: "14px" }}>
            https://api.nodsend.com
          </code>
          {" — Auth: "}
          <code style={{ background: "var(--gray-3)", padding: "3px 8px", borderRadius: "4px", fontFamily: "var(--font-mono)", fontSize: "14px" }}>
            Bearer nod_live_…
          </code>
        </p>

        {/* Quick Start */}
        <Section title="Quick start">
          <p style={{ color: "var(--gray-9)", marginBottom: "16px", lineHeight: 1.7, fontSize: "15px" }}>
            1. Sign up at <a href="/signup" style={{ color: "var(--accent)", fontWeight: 600 }}>nodsend.com/signup</a> and grab your API key.<br />
            2. POST to <code style={codeInline}>/v1/approvals</code> with the action, summary, and recipient.<br />
            3. We email the human. They click approve or reject.<br />
            4. We fire a signed webhook to your callback URL.
          </p>
        </Section>

        {/* Create approval */}
        <Section title="Create an approval">
          <p style={{ color: "var(--gray-9)", marginBottom: "16px", lineHeight: 1.7, fontSize: "15px" }}>
            Your agent calls this when it wants to do something that needs human sign-off.
          </p>
          <CodeBlock>{`POST /v1/approvals
Authorization: Bearer nod_live_...
Content-Type: application/json

{
  "action": "book_flight",
  "summary": "Book SFO→JFK for $350 on United, departing Aug 15",
  "details": { "price": 350, "airline": "United" },
  "channel": "email",
  "recipient": "founder@company.com",
  "expires_in": "1h",
  "webhook_url": "https://your-agent.com/webhooks"
}`}</CodeBlock>
        </Section>

        {/* Response */}
        <Section title="Response">
          <CodeBlock>{`{
  "id": "clk...",
  "status": "pending",
  "action": "book_flight",
  "summary": "Book SFO→JFK for $350...",
  "channel": "email",
  "recipient": "founder@company.com",
  "expires_at": "2026-08-07T20:00:00.000Z",
  "created_at": "2026-08-07T19:00:00.000Z",
  "approve_url": "https://nodsend.com/a/clk.../approve?t=...",
  "reject_url": "https://nodsend.com/a/clk.../reject?t=..."
}`}</CodeBlock>
        </Section>

        {/* Parameters */}
        <Section title="Parameters">
          <div style={{ border: "1px solid var(--gray-3)", borderRadius: "10px", overflow: "hidden" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Type</th>
                  <th>Required</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {params.map((p) => (
                  <tr key={p.field}>
                    <td><code style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--accent-dim)" }}>{p.field}</code></td>
                    <td style={{ fontSize: "13px" }}>{p.type}</td>
                    <td style={{ fontSize: "13px" }}>{p.required ? "✓" : "—"}</td>
                    <td style={{ fontSize: "13px" }}>{p.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Webhook payload */}
        <Section title="Webhook payload">
          <p style={{ color: "var(--gray-9)", marginBottom: "16px", lineHeight: 1.7, fontSize: "15px" }}>
            When the human decides, we POST this to your <code style={codeInline}>webhook_url</code>. Verify the HMAC-SHA256 signature.
          </p>
          <CodeBlock>{`Headers:
  X-Nodsend-Signature: t=<timestamp>,v1=<hex-signature>
  X-Nodsend-Event: approval.approved

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
}`}</CodeBlock>
        </Section>

        {/* All endpoints */}
        <Section title="All endpoints">
          <div style={{ border: "1px solid var(--gray-3)", borderRadius: "10px", overflow: "hidden" }}>
            <table className="data-table">
              <tbody>
                {endpoints.map((e) => (
                  <tr key={e.method + e.path}>
                    <td style={{ width: "80px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          fontFamily: "var(--font-mono)",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          background: methodColor(e.method),
                          color: "#050505",
                        }}
                      >
                        {e.method}
                      </span>
                    </td>
                    <td>
                      <code style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--gray-12)" }}>
                        {e.path}
                      </code>
                    </td>
                    <td style={{ color: "var(--gray-8)", fontSize: "13px" }}>{e.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>

      <Footer />
    </div>
  );
}

const codeInline: React.CSSProperties = {
  background: "var(--gray-3)",
  padding: "2px 6px",
  borderRadius: "4px",
  fontFamily: "var(--font-mono)",
  fontSize: "13px",
};

const params = [
  { field: "action", type: "string", required: true, desc: 'Machine-readable action type, e.g. "book_flight"' },
  { field: "summary", type: "string", required: true, desc: "Human-readable one-line summary (max 500 chars)" },
  { field: "details", type: "object", required: false, desc: "Arbitrary metadata (shown to the human)" },
  { field: "channel", type: "string", required: false, desc: '"email" (default), "slack", or "dashboard"' },
  { field: "recipient", type: "string", required: true, desc: "Email address of the approver" },
  { field: "expires_in", type: "string", required: false, desc: '"5m", "1h", "24h" — default "1h"' },
  { field: "webhook_url", type: "string", required: false, desc: "URL to receive the decision webhook" },
  { field: "agent_name", type: "string", required: false, desc: "Display name for the agent" },
];

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
  return m === "POST" ? "var(--accent)" : m === "GET" ? "var(--success)" : "var(--gray-6)";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "48px" }}>
      <h2
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "20px",
          fontWeight: 700,
          color: "var(--gray-12)",
          margin: "0 0 16px",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="code-window" style={{ marginBottom: "24px" }}>
      <div className="code-window-header">
        <div className="code-dot" />
        <div className="code-dot" />
        <div className="code-dot" />
      </div>
      <pre>
        <code>{children}</code>
      </pre>
    </div>
  );
}