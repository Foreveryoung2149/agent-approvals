import Link from "next/link";

const codeExample = `// Your agent wants to do something consequential.
// One API call — we handle the rest.

const response = await fetch("https://api.agentapprovals.dev/v1/approvals", {
  method: "POST",
  headers: {
    "Authorization": "Bearer appr_live_...",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    action: "book_flight",
    summary: "Book SFO→JFK for $350 on United, departing Aug 15",
    details: { price: 350, airline: "United", route: "SFO→JFK" },
    channel: "email",
    recipient: "founder@company.com",
    expires_in: "1h",
    webhook_url: "https://your-agent.com/webhooks",
  }),
});

const { id, approve_url } = await response.json();
// We email the human. They click approve.
// You get a signed webhook: { event: "approval.approved" }`;

export default function Home() {
  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 32px", borderBottom: `1px solid var(--border)`,
      }}>
        <span style={{ fontWeight: 700, fontSize: "18px" }}>Agent Approvals</span>
        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          <Link href="/docs" style={{ color: "var(--muted)", fontSize: "14px" }}>Docs</Link>
          <Link href="/pricing" style={{ color: "var(--muted)", fontSize: "14px" }}>Pricing</Link>
          <Link href="/signup" style={{
            background: "var(--blue)", color: "#fff", padding: "8px 16px",
            borderRadius: "8px", fontSize: "14px", fontWeight: 600,
          }}>Get a key</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: "840px", margin: "0 auto", padding: "80px 32px", textAlign: "center" }}>
        <div style={{
          display: "inline-block", padding: "6px 14px", borderRadius: "999px",
          background: "var(--surface)", border: `1px solid var(--border)`,
          color: "var(--muted)", fontSize: "13px", marginBottom: "24px",
        }}>
          Human-in-the-loop for AI agents
        </div>
        <h1 style={{
          fontSize: "48px", fontWeight: 800, lineHeight: 1.1,
          margin: "0 0 20px", letterSpacing: "-0.02em",
        }}>
          Your agent asks.<br />
          A human decides.<br />
          <span style={{ color: "var(--blue)" }}>You get a webhook.</span>
        </h1>
        <p style={{
          fontSize: "20px", color: "var(--muted)", lineHeight: 1.5,
          maxWidth: "600px", margin: "0 auto 40px",
        }}>
          One API call. We email the human with approve/reject buttons.
          They click. You get a signed webhook. That's it.
        </p>
        <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
          <Link href="/signup" style={{
            background: "var(--blue)", color: "#fff", padding: "14px 28px",
            borderRadius: "8px", fontWeight: 600, fontSize: "16px",
          }}>Start free — 100 approvals/mo</Link>
          <Link href="/docs" style={{
            border: `1px solid var(--border)`, color: "var(--text)",
            padding: "14px 28px", borderRadius: "8px", fontWeight: 600, fontSize: "16px",
          }}>Read the docs</Link>
        </div>
      </section>

      {/* Code example */}
      <section style={{ maxWidth: "760px", margin: "0 auto 80px", padding: "0 32px" }}>
        <pre style={{
          background: "var(--surface)", border: `1px solid var(--border)`,
          borderRadius: "12px", padding: "24px", overflow: "auto",
          fontSize: "13px", lineHeight: 1.6, color: "var(--muted)",
        }}>
          <code>{codeExample}</code>
        </pre>
      </section>

      {/* Features */}
      <section style={{ maxWidth: "840px", margin: "0 auto", padding: "0 32px 80px" }}>
        <h2 style={{ fontSize: "28px", fontWeight: 700, textAlign: "center", marginBottom: "40px" }}>
          Everything you need, nothing you don't
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {features.map((f) => (
            <div key={f.title} style={{
              background: "var(--surface)", border: `1px solid var(--border)`,
              borderRadius: "12px", padding: "24px",
            }}>
              <h3 style={{ fontSize: "17px", fontWeight: 600, margin: "0 0 8px" }}>{f.title}</h3>
              <p style={{ fontSize: "14px", color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: `1px solid var(--border)`, padding: "32px",
        textAlign: "center", color: "var(--dim)", fontSize: "14px",
      }}>
        Agent Approvals — Human-in-the-loop infrastructure for the agent age.
      </footer>
    </div>
  );
}

const features = [
  {
    title: "One API call",
    body: "POST your action, summary, and recipient. We handle delivery, token signing, expiry, and webhooks.",
  },
  {
    title: "Email delivery",
    body: "The human gets a clean email with Approve and Reject buttons. No login. No dashboard. One click.",
  },
  {
    title: "Signed webhooks",
    body: "When the human decides, we fire an HMAC-SHA256-signed webhook to your agent. Verify and continue.",
  },
  {
    title: "Auto-expiry",
    body: "Set expires_in to 5m, 1h, or 24h. If the human doesn't respond, we mark it expired and notify you.",
  },
  {
    title: "Full audit trail",
    body: "Every event — created, delivered, approved, rejected, expired, cancelled — is logged and queryable.",
  },
  {
    title: "Framework-ready",
    body: "Works with LangChain, CrewAI, AutoGen, Pydantic AI. Add one line: request_approval(action, summary).",
  },
];