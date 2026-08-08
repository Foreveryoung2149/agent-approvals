import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "../components/CodeBlock";
import Footer from "../components/Footer";
import { Icon } from "../components/Icon";
import Navbar from "../components/Navbar";

export const metadata: Metadata = { title: "Developer documentation", description: "Build secure human approval checkpoints into LangChain, CrewAI, AutoGen, or any agent workflow." };

const createExample = `curl https://api.nodsend.com/v1/approvals \\
  -X POST \\
  -H "Authorization: Bearer appr_live_..." \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: deploy-prod-1042" \\
  -d '{
    "action": "deploy_production",
    "summary": "Release version 4.2 to production",
    "channel": "email",
    "recipient": "owner@company.com",
    "expires_in": "1h",
    "external_id": "release-1042"
  }'`;

const webhookExample = `Nodsend-Webhook-Id: evt_01J...
Nodsend-Webhook-Timestamp: 1786197600
Nodsend-Webhook-Signature: v1=8f7d...

{
  "event_id": "evt_01J...",
  "event_type": "approval.approved",
  "created_at": "2026-08-08T12:00:00Z",
  "data": {
    "approval": {
      "id": "apr_01J...",
      "status": "approved",
      "action": "deploy_production"
    }
  }
}`;

const integrationExamples = {
  langchain: `from nodsend.integrations.langchain import approval_kwargs_from_interrupt

approval = nodsend.approvals.create(
    **approval_kwargs_from_interrupt(
        interrupt,
        recipient="owner@company.com",
        thread_id=thread_id,
        webhook_id=webhook_id,
    )
)`,
  crewai: `from nodsend.integrations.crewai import NodsendFeedbackProvider

provider = NodsendFeedbackProvider(
    nodsend,
    recipient="finance@company.com",
    webhook_id=webhook_id,
)

# Pass provider to CrewAI's @human_feedback gate.`,
  autogen: `from nodsend.integrations.autogen import function_tool

guarded_deploy = function_tool(
    deploy_production,
    client=nodsend,
    recipient="ops@company.com",
    summary="Deploy version 4.2 to production",
    description="Deploy only after human approval",
)
assistant = AssistantAgent(tools=[guarded_deploy])`,
};

const parameters = [
  ["action", "string", "yes", "Stable machine-readable action name."],
  ["summary", "string", "yes", "Plain-language decision summary."],
  ["recipient", "email", "yes", "Person authorized to decide."],
  ["channel", "email", "yes", "Delivery channel. Email is currently supported."],
  ["expires_in", "duration", "no", "Decision window such as 30m, 1h, or 1d."],
  ["external_id", "string", "no", "Your durable workflow identifier."],
  ["metadata", "object", "no", "Non-sensitive correlation data."],
  ["webhook_id", "string", "no", "A registered webhook destination."],
];

const nav = [["Quick start", "quick-start"], ["Create approval", "create"], ["Webhooks", "webhooks"], ["LangChain", "langchain"], ["CrewAI", "crewai"], ["AutoGen", "autogen"], ["Security", "security"]];

export default function DocsPage() {
  return (
    <main className="marketing-shell">
      <Navbar />
      <span id="main-content" className="skip-target" tabIndex={-1} />
      <section className="page-hero page-hero-compact"><div className="container"><span className="signal-label">Developer documentation</span><h1>Build a reliable human checkpoint.</h1><p>Start with one API request, then connect the approval outcome to your framework’s native pause-and-resume lifecycle.</p></div></section>
      <div className="container docs-shell">
        <aside className="docs-nav" aria-label="Documentation sections"><span>On this page</span>{nav.map(([label, id]) => <a key={id} href={`#${id}`}>{label}</a>)}<Link href="/signup" className="btn-primary">Get an API key</Link></aside>
        <article className="docs-content">
          <section className="doc-section" id="quick-start"><span className="doc-index">01 / Start</span><h2>Quick start</h2><p>Create an approval with your server-side API key. The human receives a single-use decision link; your application receives the result through a signed webhook.</p><div className="doc-callout"><Icon name="key" size={18} /><div><strong>Keep API keys server-side.</strong><span>Never expose an <code>appr_live_</code> key in a browser, model prompt, or public decision URL.</span></div></div><CodeBlock label="cURL">{createExample}</CodeBlock></section>

          <section className="doc-section" id="create"><span id="api-reference" aria-hidden="true" /><span className="doc-index">02 / Approvals</span><h2 id="approval-fields-title">Create an approval</h2><p><code>POST /v1/approvals</code> is authenticated with an API key. Use an idempotency key whenever a network retry could otherwise create the same decision twice.</p><div className="docs-table-wrap" role="region" aria-labelledby="approval-fields-title" tabIndex={0}><table className="docs-table"><thead><tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr></thead><tbody>{parameters.map(([field, type, required, description]) => <tr key={field}><td><code>{field}</code></td><td>{type}</td><td>{required}</td><td>{description}</td></tr>)}</tbody></table></div></section>

          <section className="doc-section" id="webhooks"><span className="doc-index">03 / Outcomes</span><h2>Verify every webhook</h2><p>Compute HMAC-SHA256 over <code>{"<event_id>.<timestamp>.<raw_body>"}</code>, compare it in constant time, and reject timestamps outside your replay window.</p><CodeBlock label="Signed webhook">{webhookExample}</CodeBlock></section>

          <span id="integrations" aria-hidden="true" />
          {(Object.keys(integrationExamples) as Array<keyof typeof integrationExamples>).map((framework, index) => (
            <section className="doc-section" id={framework} key={framework}><span className="doc-index">0{index + 4} / Integration</span><h2>{framework === "langchain" ? "LangChain and LangGraph" : framework === "crewai" ? "CrewAI" : "AutoGen"}</h2><p>{framework === "langchain" ? "Bridge Nodsend to durable interrupts and resume the same thread only after the signed decision event arrives." : framework === "crewai" ? "Use Nodsend as an external feedback provider or guard selected consequential tool calls in a crew or flow." : "Keep the sensitive side effect inside an approval-aware function tool so the model cannot bypass the decision boundary."}</p><CodeBlock label="Python">{integrationExamples[framework]}</CodeBlock></section>
          ))}

          <section className="doc-section" id="security"><span className="doc-index">07 / Security</span><h2>Security model</h2><div className="docs-security-grid">{[["lock", "Approval-bound tokens", "Human decision tokens authorize one approval and are stored as hashes."], ["approval", "Atomic state changes", "Only one terminal decision can win, even under concurrent requests."], ["webhook", "Replay-aware events", "Stable event IDs, timestamps, and HMAC signatures protect resumption."], ["shield", "Tenant isolation", "Agent APIs scope every approval and webhook to the owning workspace."]].map(([icon, title, text]) => <div key={title}><Icon name={icon as "lock"} size={19} /><strong>{title}</strong><p>{text}</p></div>)}</div></section>
        </article>
      </div>
      <Footer />
    </main>
  );
}
