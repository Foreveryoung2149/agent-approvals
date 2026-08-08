import type { Metadata } from "next";
import Link from "next/link";
import Footer from "../components/Footer";
import { Icon } from "../components/Icon";
import Navbar from "../components/Navbar";

export const metadata: Metadata = { title: "Pricing", description: "Start adding accountable human decisions to agent workflows for free." };

const plans = [
  { name: "Build", price: "$0", cadence: "forever", state: "Available", description: "For prototypes and production pilots.", cta: "Start building", href: "/signup", features: ["100 approval requests / month", "Email decision delivery", "Signed webhook outcomes", "Decision audit history", "LangChain, CrewAI, and AutoGen adapters"] },
  { name: "Operate", price: "$19", cadence: "per month", state: "Early access", description: "For growing, customer-facing workflows.", cta: "Join early access", href: "mailto:hello@nodsend.com?subject=Nodsend%20Operate", features: ["1,000 approval requests / month", "Everything in Build", "Longer event retention", "Priority support", "Usage export"] },
  { name: "Scale", price: "Custom", cadence: "annual agreement", state: "Talk to us", description: "For higher-volume and regulated teams.", cta: "Contact us", href: "mailto:hello@nodsend.com?subject=Nodsend%20Scale", features: ["Custom approval volume", "Everything in Operate", "Data-retention controls", "Architecture review", "Custom support agreement"] },
];

export default function PricingPage() {
  return (
    <main className="marketing-shell">
      <Navbar />
      <span id="main-content" className="skip-target" tabIndex={-1} />
      <section className="page-hero"><div className="container"><span className="signal-label">Simple, honest pricing</span><h1>Start with oversight.<br />Scale with confidence.</h1><p>Build and test the full approval loop without a credit card. Upgrade when decision volume becomes operational infrastructure.</p></div></section>
      <section className="pricing-section"><div className="container pricing-grid">{plans.map((plan, index) => <article className="price-card" data-featured={index === 0} key={plan.name}><header><span className="availability-pill">{plan.state}</span><h2>{plan.name}</h2><p>{plan.description}</p></header><div className="price-line"><strong>{plan.price}</strong><span>{plan.cadence}</span></div><Link href={plan.href} className={index === 0 ? "btn-primary" : "btn-secondary"}>{plan.cta}<Icon name="arrow" size={15} /></Link><ul>{plan.features.map(feature => <li key={feature}><Icon name="check" size={15} />{feature}</li>)}</ul></article>)}</div></section>
      <section className="pricing-proof"><div className="container"><header className="section-heading"><span className="signal-label">Included by design</span><h2>The safety properties are not add-ons.</h2><p>Every plan gets the same approval-bound tokens, atomic decisions, signed events, and tenant isolation.</p></header><div className="mini-feature-grid">{[["shield", "Secure decision links"], ["webhook", "Signed outcome events"], ["activity", "Lifecycle audit record"], ["code", "Framework adapters"]].map(([icon, title]) => <div key={title}><Icon name={icon as "shield"} size={20} /><strong>{title}</strong></div>)}</div></div></section>
      <section className="final-cta"><div className="container"><span className="signal-label">No card. No lock-in.</span><h2>Put your first decision gate live today.</h2><p>The Build plan includes 100 approval requests every month.</p><div className="hero-actions"><Link href="/signup" className="btn-primary">Create a workspace <Icon name="arrow" size={16} /></Link><Link href="/docs" className="btn-secondary">Read the docs</Link></div></div></section>
      <Footer />
    </main>
  );
}
