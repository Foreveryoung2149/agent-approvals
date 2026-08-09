import type { Metadata } from "next";
import Link from "next/link";
import Footer from "../components/Footer";
import { Icon } from "../components/Icon";
import Navbar from "../components/Navbar";

export const metadata: Metadata = { title: "Pricing", description: "Nodsend is free and open source. 1,000 approval requests per month on the hosted version, or self-host for unlimited." };

export default function PricingPage() {
  return (
    <main className="marketing-shell">
      <Navbar />
      <span id="main-content" className="skip-target" tabIndex={-1} />
      <section className="page-hero"><div className="container"><span className="signal-label">Free and open source</span><h1>No tiers. No upsells.<br />Just approvals.</h1><p>Nodsend is MIT-licensed and free forever. Use the hosted version or self-host for unlimited approvals.</p></div></section>
      <section className="pricing-section">
        <div className="container pricing-grid">
          <article className="price-card" data-featured={true}>
            <header>
              <span className="availability-pill">Available now</span>
              <h2>Free</h2>
              <p>Everything you need. No credit card.</p>
            </header>
            <div className="price-line"><strong>$0</strong><span>forever</span></div>
            <Link href="/signup" className="btn-primary">Get started free<Icon name="arrow" size={15} /></Link>
            <ul>
              <li><Icon name="check" size={15} />1,000 approval requests / month</li>
              <li><Icon name="check" size={15} />Email decision delivery</li>
              <li><Icon name="check" size={15} />Signed webhook outcomes</li>
              <li><Icon name="check" size={15} />Decision audit history</li>
              <li><Icon name="check" size={15} />LangChain, CrewAI, and AutoGen adapters</li>
              <li><Icon name="check" size={15} />Python SDK</li>
              <li><Icon name="check" size={15} />Full OpenAPI spec</li>
              <li><Icon name="check" size={15} />2FA account security</li>
            </ul>
          </article>
          
          <article className="price-card">
            <header>
              <span className="availability-pill">Open source</span>
              <h2>Self-Host</h2>
              <p>Run Nodsend on your own infrastructure. Unlimited approvals.</p>
            </header>
            <div className="price-line"><strong>$0</strong><span>MIT licensed</span></div>
            <Link href="https://github.com/Foreveryoung2149/agent-approvals" className="btn-secondary" target="_blank" rel="noopener noreferrer">View on GitHub<Icon name="arrow" size={15} /></Link>
            <ul>
              <li><Icon name="check" size={15} />Unlimited approval requests</li>
              <li><Icon name="check" size={15} />Everything in Free</li>
              <li><Icon name="check" size={15} />Docker Compose one-command setup</li>
              <li><Icon name="check" size={15} />Full source code access</li>
              <li><Icon name="check" size={15} />Deploy anywhere</li>
            </ul>
          </article>
        </div>
      </section>
      <section className="pricing-proof"><div className="container"><header className="section-heading"><span className="signal-label">Included by design</span><h2>The safety properties are not add-ons.</h2><p>Every deployment gets the same approval-bound tokens, atomic decisions, signed events, and tenant isolation.</p></header><div className="mini-feature-grid">{[["shield", "Secure decision links"], ["webhook", "Signed outcome events"], ["activity", "Lifecycle audit record"], ["code", "Framework adapters"]].map(([icon, title]) => <div key={title}><Icon name={icon as "shield"} size={20} /><strong>{title}</strong></div>)}</div></div></section>
      <section className="final-cta"><div className="container"><span className="signal-label">Free. Open source. MIT licensed.</span><h2>Put your first decision gate live today.</h2><p>1,000 approval requests every month on the hosted version. Self-host for unlimited.</p><div className="hero-actions"><Link href="/signup" className="btn-primary">Create a workspace <Icon name="arrow" size={16} /></Link><Link href="https://github.com/Foreveryoung2149/agent-approvals" className="btn-secondary" target="_blank" rel="noopener noreferrer">Star on GitHub</Link></div></div></section>
      <Footer />
    </main>
  );
}
