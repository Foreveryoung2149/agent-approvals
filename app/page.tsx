import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Link from "next/link";

const codeExamples: Record<string, string> = {
  python: `import requests

resp = requests.post(
    "https://api.nodsend.com/v1/approvals",
    headers={"Authorization": "Bearer nod_live_..."},
    json={
        "action": "book_flight",
        "summary": "Book SFO→JFK for $350 on United, Aug 15",
        "channel": "email",
        "recipient": "ceo@company.com",
        "expires_in": "1h",
        "webhook_url": "https://your-agent.com/webhook",
    },
)

approval = resp.json()
# We email the human. They click approve.
# You get a signed webhook: { "event": "approval.approved" }`,

  node: `const res = await fetch("https://api.nodsend.com/v1/approvals", {
  method: "POST",
  headers: {
    "Authorization": "Bearer nod_live_...",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    action: "book_flight",
    summary: "Book SFO→JFK for $350 on United, Aug 15",
    channel: "email",
    recipient: "ceo@company.com",
    expires_in: "1h",
    webhook_url: "https://your-agent.com/webhook",
  }),
});

const { id, status } = await res.json();
// We email the human. They click approve.
// You get a signed webhook: { event: "approval.approved" }`,

  curl: `curl -X POST https://api.nodsend.com/v1/approvals \\
  -H "Authorization: Bearer nod_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "book_flight",
    "summary": "Book SFO→JFK for $350 on United, Aug 15",
    "channel": "email",
    "recipient": "ceo@company.com",
    "expires_in": "1h",
    "webhook_url": "https://your-agent.com/webhook"
  }'`,
};

const features = [
  {
    icon: "⚡",
    label: "One API Call",
    title: "POST your action. We handle everything.",
    body: "Send the action, summary, and recipient. We deliver, track, expire, and webhook — you write zero infrastructure code.",
    bullets: ["Email delivery included", "Auto-expiry built in", "Signed webhook response"],
    link: { href: "/docs", text: "Read the docs →" },
  },
  {
    icon: "🔐",
    label: "Signed Webhooks",
    title: "Tamper-proof. Verifiable. Auditable.",
    body: "When the human decides, we fire an HMAC-SHA256-signed webhook to your agent. Verify the signature and continue.",
    bullets: ["HMAC-SHA256 signatures", "Retry with backoff", "Full delivery log"],
    link: { href: "/docs", text: "Webhook docs →" },
  },
  {
    icon: "📋",
    label: "Audit Trail",
    title: "Every event logged. Every decision tracked.",
    body: "Full lifecycle audit: created, delivered, approved, rejected, expired, cancelled. Query any approval's history via API.",
    bullets: ["Compliance-ready logs", "Queryable via API", "Tamper-proof events"],
    link: { href: "/docs", text: "Audit API →" },
  },
];

const sdkItems = [
  "LangChain", "CrewAI", "AutoGen", "Pydantic AI", "OpenAI SDK",
  "LlamaIndex", "Python", "Node.js", "Go", "Rust", "curl", "REST",
];

const steps = [
  {
    num: "01",
    title: "Agent calls the API",
    description: "Your agent sends a POST with the action summary, recipient email, and an expiry window.",
  },
  {
    num: "02",
    title: "Human gets the email",
    description: "We send a clean email with one-click Approve and Reject buttons. No login needed. No app to install.",
  },
  {
    num: "03",
    title: "You get the webhook",
    description: "The moment the human decides, we fire a signed webhook to your agent. Verify and continue execution.",
  },
];

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />

      {/* ── Hero ─────────────────────────────────── */}
      <section style={{ padding: "100px 0 60px", textAlign: "center" }}>
        <div className="container" style={{ maxWidth: "860px" }}>
          <div className="eyebrow" style={{ marginBottom: "28px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
            Human-in-the-loop for AI agents
          </div>

          <h1
            className="heading-display"
            style={{
              fontSize: "clamp(36px, 5.5vw, 64px)",
              margin: "0 0 24px",
              color: "var(--gray-12)",
            }}
          >
            Your agent asks.{" "}
            <br />
            A human decides.{" "}
            <br />
            <span style={{ color: "var(--accent)" }}>You get a webhook.</span>
          </h1>

          <p
            style={{
              fontSize: "18px",
              color: "var(--gray-9)",
              maxWidth: "560px",
              margin: "0 auto 40px",
              lineHeight: 1.7,
            }}
          >
            One API call. We email the human with approve/reject buttons.
            They click. You get a signed webhook. That&apos;s it.
          </p>

          <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/signup" className="btn-primary" style={{ fontSize: "15px", padding: "0 28px", minHeight: "48px" }}>
              Get your API key — it&apos;s free
            </Link>
            <Link href="/docs" className="btn-secondary" style={{ fontSize: "15px", padding: "0 28px", minHeight: "48px" }}>
              Read the docs
            </Link>
          </div>
        </div>
      </section>

      {/* ── SDK Marquee ──────────────────────────── */}
      <div className="sdk-marquee">
        <div className="sdk-marquee-track">
          {[...sdkItems, ...sdkItems].map((name, i) => (
            <div key={i} className="sdk-pill">
              {name}
            </div>
          ))}
        </div>
      </div>

      {/* ── Code Window ──────────────────────────── */}
      <section style={{ padding: "80px 0" }}>
        <div className="container" style={{ maxWidth: "780px" }}>
          <div className="code-window">
            <div className="code-window-header">
              <div className="code-dot" />
              <div className="code-dot" />
              <div className="code-dot" />
              <span
                style={{
                  marginLeft: "auto",
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  color: "var(--gray-8)",
                }}
              >
                api.nodsend.com
              </span>
            </div>
            <div className="code-tabs">
              <button className="code-tab active">Python</button>
              <button className="code-tab">Node.js</button>
              <button className="code-tab">cURL</button>
            </div>
            <pre>
              <code>{codeExamples.python}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* ── Glow separator ───────────────────────── */}
      <div className="glow-line" />

      {/* ── How it works ─────────────────────────── */}
      <section className="section">
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <div className="eyebrow" style={{ marginBottom: "20px" }}>How it works</div>
            <h2
              className="heading-display"
              style={{ fontSize: "clamp(28px, 4vw, 42px)", color: "var(--gray-12)", margin: 0 }}
            >
              Three steps. Zero infrastructure.
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "24px",
            }}
          >
            {steps.map((step) => (
              <div key={step.num} className="feature-card">
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "48px",
                    fontWeight: 800,
                    color: "var(--accent-muted)",
                    lineHeight: 1,
                    marginBottom: "20px",
                  }}
                >
                  {step.num}
                </div>
                <h3
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "17px",
                    fontWeight: 700,
                    color: "var(--gray-12)",
                    margin: "0 0 10px",
                    lineHeight: 1.3,
                  }}
                >
                  {step.title}
                </h3>
                <p style={{ fontSize: "14px", color: "var(--gray-9)", lineHeight: 1.65, margin: 0 }}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="glow-line" />

      {/* ── Features Grid (Kilo-style) ───────────── */}
      <section className="section">
        <div className="container">
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <div className="eyebrow" style={{ marginBottom: "20px" }}>Built for production</div>
            <h2
              className="heading-display"
              style={{ fontSize: "clamp(28px, 4vw, 42px)", color: "var(--gray-12)", margin: 0 }}
            >
              Everything you need.{" "}
              <span style={{ color: "var(--gray-8)" }}>Nothing you don&apos;t.</span>
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "24px",
            }}
          >
            {features.map((f) => (
              <div key={f.label} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <div className="feature-label">{f.label}</div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
                <ul className="feature-bullets">
                  {f.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
                <Link href={f.link.href} className="feature-link">
                  {f.link.text}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="glow-line" />

      {/* ── Bottom CTA ───────────────────────────── */}
      <section style={{ padding: "100px 0 80px" }}>
        <div className="container" style={{ textAlign: "center", maxWidth: "640px" }}>
          <h2
            className="heading-display"
            style={{ fontSize: "clamp(24px, 3.5vw, 36px)", color: "var(--gray-12)", margin: "0 0 16px" }}
          >
            Your agents should ask{" "}
            <span style={{ color: "var(--accent)" }}>before they act.</span>
          </h2>
          <p style={{ fontSize: "16px", color: "var(--gray-9)", marginBottom: "36px", lineHeight: 1.7 }}>
            Start free. No credit card. 100 approvals/month included.
          </p>
          <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/signup" className="btn-primary" style={{ padding: "0 28px", minHeight: "48px", fontSize: "15px" }}>
              Get started free
            </Link>
            <Link href="/docs" className="btn-secondary" style={{ padding: "0 28px", minHeight: "48px", fontSize: "15px" }}>
              View documentation
            </Link>
          </div>

          {/* Platform pills (Kilo style) */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              justifyContent: "center",
              marginTop: "48px",
              flexWrap: "wrap",
            }}
          >
            {["Email", "Slack", "Dashboard", "Webhook"].map((ch) => (
              <span
                key={ch}
                style={{
                  padding: "7px 16px",
                  borderRadius: "999px",
                  border: "1px solid var(--gray-4)",
                  background: "rgba(255, 255, 255, 0.02)",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--gray-11)",
                }}
              >
                {ch}
              </span>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}