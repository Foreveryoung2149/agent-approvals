import type { Metadata } from "next";
import Link from "next/link";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";

export const metadata: Metadata = { title: "FAQ", description: "Answers about Nodsend approvals, security, integrations, and operations." };

const questions = [
  ["What is Nodsend?", "Nodsend is human approval infrastructure for AI agents. Your server creates a decision request, Nodsend presents it to an authorized person, and your workflow resumes from a signed outcome."],
  ["Why not ask the model to request approval itself?", "A model-callable tool is useful, but it is not a security boundary because the model may omit it. Put the protected side effect behind an application-enforced Nodsend checkpoint."],
  ["Does the approver need a Nodsend account?", "No. Email recipients use an opaque, single-use link scoped to one approval. Workspace authentication and human decision authorization remain separate."],
  ["How do I know a decision is authentic?", "Nodsend signs webhook events with HMAC-SHA256. Your server verifies the signature, timestamp, and event ID before resuming the workflow."],
  ["What happens if two people decide at once?", "The decision transition is atomic. Only the first valid pending-to-terminal transition succeeds; later attempts receive the already-decided state."],
  ["What happens when a request expires?", "Expired requests cannot be approved or rejected. Your workflow can treat expiry as its own terminal outcome and escalate, retry, or stop safely."],
  ["Which agent frameworks are supported?", "The core API works with any stack. The repository also includes optional Python adapters for LangChain/LangGraph, CrewAI, and AutoGen using each framework’s native control-flow patterns."],
  ["Can Nodsend execute the sensitive action for me?", "No. Nodsend records authority; your trusted application owns execution. This keeps credentials and side effects inside your infrastructure."],
  ["Is Slack available?", "Email delivery is the supported channel today. We do not advertise Slack as available until its authentication, interaction security, and delivery lifecycle are complete."],
  ["Where should API keys be stored?", "Only on your server or in a secrets manager. Never put an API key in frontend code, a public URL, or a model prompt."],
];

export default function FAQPage() {
  return (
    <main className="marketing-shell">
      <Navbar />
      <section id="main-content" className="page-hero page-hero-compact" tabIndex={-1}>
        <div className="container"><span className="signal-label">Questions, answered</span><h1>Understand the decision boundary.</h1><p>Security, workflow behavior, integrations, and what Nodsend deliberately does not do.</p></div>
      </section>
      <section className="faq-section"><div className="container faq-layout"><aside><span className="signal-label">Still evaluating?</span><h2>Start with the threat model.</h2><p>The documentation explains how tokens, atomic decisions, and signed events protect workflow resumption.</p><Link href="/docs#security" className="btn-secondary">Security model</Link></aside><div className="faq-list">{questions.map(([question, answer], index) => <details key={question} open={index === 0}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div></div></section>
      <Footer />
    </main>
  );
}
