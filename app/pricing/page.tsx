import Link from "next/link";

export const metadata = {
  title: "Pricing — Agent Approvals",
  description: "Free tier: 100 approvals/month. Startup: 1,000/month. Business: 10,000/month. Enterprise: unlimited.",
};

export default function PricingPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 32px", borderBottom: "1px solid var(--border)" }}>
        <Link href="/" style={{ fontWeight: 700, fontSize: "18px", color: "var(--text)" }}>Agent Approvals</Link>
        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          <Link href="/docs" style={{ color: "var(--muted)", fontSize: "14px" }}>Docs</Link>
          <Link href="/signup" style={{ background: "var(--blue)", color: "#fff", padding: "8px 16px", borderRadius: "8px", fontSize: "14px", fontWeight: 600 }}>Get a key</Link>
        </div>
      </nav>

      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "64px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <h1 style={{ fontSize: "36px", fontWeight: 800, marginBottom: "12px" }}>Simple, transparent pricing</h1>
          <p style={{ color: "var(--muted)", fontSize: "18px" }}>Start free. Scale as your agents take more consequential actions.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}>
          {plans.map((p) => (
            <div
              key={p.name}
              style={{
                background: "var(--surface)", border: p.popular ? "2px solid var(--blue)" : "1px solid var(--border)",
                borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column",
              }}
            >
              {p.popular && (
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--blue)", marginBottom: "8px", textTransform: "uppercase" }}>
                  Most popular
                </div>
              )}
              <h3 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 4px" }}>{p.name}</h3>
              <div style={{ marginBottom: "16px" }}>
                <span style={{ fontSize: "32px", fontWeight: 800 }}>${p.price}</span>
                <span style={{ color: "var(--dim)", fontSize: "14px" }}>/mo</span>
              </div>
              <p style={{ fontSize: "14px", color: "var(--muted)", marginBottom: "20px", flex: 1 }}>{p.desc}</p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", fontSize: "14px", color: "var(--muted)" }}>
                {p.features.map((f) => (
                  <li key={f} style={{ padding: "4px 0", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: "var(--green)" }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                style={{
                  display: "block", textAlign: "center", padding: "12px", borderRadius: "8px",
                  background: p.popular ? "var(--blue)" : "transparent",
                  border: p.popular ? "none" : "1px solid var(--border)",
                  color: p.popular ? "#fff" : "var(--text)", fontWeight: 600, fontSize: "14px", textDecoration: "none",
                }}
              >
                {p.price === 0 ? "Get started free" : "Get started"}
              </Link>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "64px", textAlign: "center", color: "var(--dim)", fontSize: "14px" }}>
          <p>All plans include: HMAC-signed webhooks, audit trail, auto-expiry, rate limiting, 99.9% uptime SLA (paid plans).</p>
          <p style={{ marginTop: "8px" }}>Questions? <Link href="/contact" style={{ color: "var(--blue)" }}>Contact us</Link></p>
        </div>
      </div>
    </div>
  );
}

const plans = [
  {
    name: "Free",
    price: 0,
    desc: "For prototyping and small agents.",
    popular: false,
    features: ["100 approvals/mo", "Email delivery", "Signed webhooks", "Audit trail", "Community support"],
  },
  {
    name: "Startup",
    price: 19,
    desc: "For growing agent workflows.",
    popular: true,
    features: ["1,000 approvals/mo", "Email delivery", "Signed webhooks", "Audit trail", "Priority support", "Slack delivery (coming soon)"],
  },
  {
    name: "Business",
    price: 49,
    desc: "For production agents.",
    popular: false,
    features: ["10,000 approvals/mo", "Email delivery", "Signed webhooks", "Audit trail", "Priority support", "Slack delivery (coming soon)", "Multi-approver"],
  },
  {
    name: "Enterprise",
    price: 199,
    desc: "For regulated industries.",
    popular: false,
    features: ["Unlimited approvals", "All channels", "SOC2 compliance", "Dedicated support", "Custom SLAs", "On-prem option"],
  },
];