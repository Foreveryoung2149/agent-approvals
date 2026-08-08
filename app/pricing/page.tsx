import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Link from "next/link";

export const metadata = {
  title: "Pricing — Nodsend",
  description: "Start free with 100 approvals/month. Scale as your agents take more consequential actions.",
};

export default function PricingPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />

      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "80px 32px", flex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: "56px" }}>
          <div className="eyebrow" style={{ marginBottom: "20px" }}>Pricing</div>
          <h1
            className="heading-display"
            style={{ fontSize: "clamp(28px, 4vw, 42px)", color: "var(--gray-12)", margin: "0 0 12px" }}
          >
            Simple, transparent pricing
          </h1>
          <p style={{ color: "var(--gray-9)", fontSize: "17px", margin: 0 }}>
            Start free. Scale as your agents take more consequential actions.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
          {plans.map((p) => (
            <div
              key={p.name}
              className={p.highlight ? "card-accent" : "feature-card"}
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "28px",
                ...(p.highlight ? { border: "1px solid var(--accent-border)" } : {}),
              }}
            >
              {p.highlight && (
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "var(--accent)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: "12px",
                  }}
                >
                  Free forever
                </div>
              )}
              <h3
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "var(--gray-12)",
                  margin: "0 0 4px",
                }}
              >
                {p.name}
              </h3>
              <div style={{ marginBottom: "16px" }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "32px",
                    fontWeight: 800,
                    color: "var(--gray-12)",
                  }}
                >
                  ${p.price}
                </span>
                <span style={{ color: "var(--gray-8)", fontSize: "14px" }}>/mo</span>
              </div>
              <p style={{ fontSize: "14px", color: "var(--gray-9)", marginBottom: "20px", flex: 1, lineHeight: 1.5 }}>
                {p.desc}
              </p>
              <ul className="feature-bullets" style={{ marginBottom: "24px" }}>
                {p.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={p.highlight ? "btn-primary" : "btn-secondary"}
                style={{ width: "100%", textAlign: "center", fontSize: "14px" }}
              >
                {p.price === 0 ? "Get started free" : "Coming soon"}
              </Link>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "64px", textAlign: "center" }}>
          <p style={{ color: "var(--gray-8)", fontSize: "14px" }}>
            All plans include: HMAC-signed webhooks, audit trail, auto-expiry, rate limiting.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}

const plans = [
  {
    name: "Free",
    price: 0,
    desc: "For prototyping and small agents.",
    highlight: true,
    features: ["100 approvals/mo", "Email delivery", "Signed webhooks", "Audit trail", "Dashboard"],
  },
  {
    name: "Startup",
    price: 19,
    desc: "For growing agent workflows.",
    highlight: false,
    features: ["1,000 approvals/mo", "Everything in Free", "Priority support", "Slack delivery", "Custom branding"],
  },
  {
    name: "Business",
    price: 49,
    desc: "For production agents at scale.",
    highlight: false,
    features: ["10,000 approvals/mo", "Everything in Startup", "Multi-approver", "SSO / SAML", "99.9% uptime SLA"],
  },
  {
    name: "Enterprise",
    price: 199,
    desc: "For regulated industries.",
    highlight: false,
    features: ["Unlimited approvals", "All channels", "SOC2 compliance", "Dedicated support", "Custom SLAs"],
  },
];