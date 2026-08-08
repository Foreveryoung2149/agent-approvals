import Link from "next/link";
import Footer from "./components/Footer";
import { Icon, type IconName } from "./components/Icon";
import Navbar from "./components/Navbar";
import TerminalDemo from "./components/TerminalDemo";

const capabilities: Array<{ icon: IconName; label: string; title: string; description: string; points: string[] }> = [
  { icon: "approval", label: "Decision gates", title: "Pause the action, not the whole workflow.", description: "Create a durable checkpoint with the context a person needs to make a confident decision.", points: ["Single-use decision links", "Explicit expiry and cancellation", "Structured decision context"] },
  { icon: "webhook", label: "Signed outcomes", title: "Resume from a result you can verify.", description: "Every outcome is delivered as a signed event your application can authenticate before it continues.", points: ["HMAC-SHA256 signatures", "Stable event identifiers", "Idempotent workflow resumption"] },
  { icon: "activity", label: "Operational record", title: "See who decided what, and when.", description: "Trace requests, delivery attempts, decisions, expiry, and cancellation without rebuilding audit infrastructure.", points: ["Lifecycle event history", "Searchable approval queue", "Human-readable evidence"] },
];

const integrations = [
  ["LangChain", "Durable approval interrupts for agent tools and LangGraph threads."],
  ["CrewAI", "External human feedback for crews, flows, and guarded tool calls."],
  ["AutoGen", "Approval-aware function tools for consequential agent actions."],
];

const trace = [
  ["01", "Agent requests", "The agent describes the action, recipient, and expiry window."],
  ["02", "Human decides", "Nodsend presents a focused approve or reject decision—no account required."],
  ["03", "Workflow resumes", "Your application verifies the signed event and executes exactly once."],
];

export default function Home() {
  return (
    <main className="marketing-shell">
      <Navbar />
      <section id="main-content" className="signal-hero" tabIndex={-1}>
        <div className="container">
          <div className="hero-kicker">Human control for autonomous systems</div>
          <h1 className="hero-title">
            <span>Agents move fast.</span>
            <span>Decisions stay <em>accountable.</em></span>
          </h1>
          <p className="hero-summary">Put a secure human checkpoint between intent and execution. Nodsend gives every AI framework one approval API, signed outcomes, and a complete decision record.</p>
          <div className="hero-actions">
            <Link href="/signup" className="btn-primary">Create a free workspace <Icon name="arrow" size={16} /></Link>
            <Link href="/docs" className="btn-secondary">Explore the API <Icon name="code" size={16} /></Link>
          </div>
          <div className="hero-proof" aria-label="Product assurances">
            <span><Icon name="check" size={15} /> No credit card</span>
            <span><Icon name="shield" size={15} /> Signed decisions</span>
            <span><Icon name="pulse" size={15} /> Framework independent</span>
          </div>
        </div>
      </section>

      <TerminalDemo />

      <section className="trust-strip" aria-label="Platform capabilities">
        <div className="container trust-grid">
          <div className="trust-stat"><strong>1</strong><span>Approval API</span></div>
          <div className="trust-stat"><strong>3</strong><span>Native agent adapters</span></div>
          <div className="trust-stat"><strong>100%</strong><span>Signed decision events</span></div>
        </div>
      </section>

      <section className="section" id="how-it-works">
        <div className="container">
          <header className="section-heading">
            <span className="signal-label">The decision circuit</span>
            <h2>Autonomy with a deliberate stop button.</h2>
            <p>Nodsend separates model intent, human authority, and side-effect execution into a clear, auditable flow.</p>
          </header>
          <div className="decision-trace">
            {trace.map(([number, title, description], index) => (
              <article className="trace-step" key={number}>
                <div className="trace-node"><span>{number}</span>{index < trace.length - 1 && <i />}</div>
                <div><h3>{title}</h3><p>{description}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-tinted">
        <div className="container">
          <header className="section-heading">
            <span className="signal-label">Control plane</span>
            <h2>Everything needed to make “ask first” production-ready.</h2>
            <p>Purpose-built primitives for approvals—not another general automation platform.</p>
          </header>
          <div className="capability-grid">
            {capabilities.map((capability) => (
              <article className="capability-card" key={capability.label}>
                <span><Icon name={capability.icon} size={24} /></span>
                <small>{capability.label}</small>
                <h3>{capability.title}</h3>
                <p>{capability.description}</p>
                <ul>{capability.points.map((point) => <li key={point}><Icon name="check" size={14} />{point}</li>)}</ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="integrations">
        <div className="container">
          <header className="section-heading">
            <span className="signal-label">Framework-native</span>
            <h2>One human layer across your agent stack.</h2>
            <p>Use Nodsend with native pause-and-resume patterns instead of teaching a model to police itself.</p>
          </header>
          <div className="integration-grid">
            {integrations.map(([name, description]) => (
              <article className="integration-card" key={name}>
                <header><span><Icon name="spark" size={21} /></span><code>Python adapter</code></header>
                <h3>{name}</h3><p>{description}</p>
                <Link href={`/docs#${name.toLowerCase()}`}>View integration <Icon name="arrow" size={14} /></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="security-panel">
            <div className="security-copy">
              <span className="signal-label">Designed for consequential actions</span>
              <h2>A human decision should be a security boundary.</h2>
              <p>Opaque single-use tokens, approval-bound authorization, atomic state changes, and signed webhooks protect the line between “approved” and “executed.”</p>
              <Link href="/docs#security" className="btn-secondary">Read the security model <Icon name="arrow" size={15} /></Link>
            </div>
            <div className="security-readout" aria-label="Security controls">
              {["Approval-bound tokens", "Atomic decisions", "Replay-aware webhooks", "Tenant-isolated API keys"].map((item, index) => (
                <div key={item}><span>0{index + 1}</span><Icon name="lock" size={17} /><strong>{item}</strong><Icon name="check" size={16} /></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="container">
          <span className="signal-label">Ship accountable autonomy</span>
          <h2>Your agent can act fast.<br />It can still ask first.</h2>
          <p>Start with 100 approval requests each month. No credit card required.</p>
          <div className="hero-actions"><Link href="/signup" className="btn-primary">Start building <Icon name="arrow" size={16} /></Link><Link href="/docs" className="btn-secondary">Read the docs</Link></div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
