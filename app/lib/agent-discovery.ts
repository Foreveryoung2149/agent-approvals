import { blogPosts, getBlogPost, type BlogPost } from "../blog/posts";

export const SITE_ORIGIN = "https://nodsend.com";
export const API_ORIGIN = "https://api.nodsend.com";

export const CONTENT_SIGNAL = "ai-train=no, search=yes, ai-input=yes";

export const API_CATALOG_PROFILE = "https://www.rfc-editor.org/info/rfc9727";
export const API_CATALOG_MEDIA_TYPE =
  `application/linkset+json; profile="${API_CATALOG_PROFILE}"`;

export const API_CATALOG = {
  linkset: [
    {
      anchor: `${API_ORIGIN}/`,
      "service-desc": [
        { href: `${API_ORIGIN}/openapi.yaml`, type: "application/yaml" },
      ],
      "service-doc": [
        { href: `${SITE_ORIGIN}/docs`, type: "text/html" },
      ],
      status: [
        { href: `${API_ORIGIN}/health`, type: "application/json" },
      ],
    },
  ],
} as const;

export const DISCOVERY_LINK_HEADER = [
  `</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"`,
  `<${API_ORIGIN}/openapi.yaml>; rel="service-desc"; type="application/yaml"`,
  `</docs>; rel="service-doc"; type="text/html"`,
  `</auth.md>; rel="describedby"; type="text/markdown"`,
  `</.well-known/oauth-protected-resource>; rel="oauth-protected-resource"; type="application/json"`,
].join(", ");

const markdownRoutes = new Set([
  "/",
  "/docs",
  "/pricing",
  "/faq",
  "/blog",
  "/contact",
  "/privacy",
  "/terms",
]);

export function isMarkdownRoute(pathname: string) {
  return markdownRoutes.has(pathname) || pathname.startsWith("/blog/");
}

export function acceptsMarkdown(acceptHeader: string | null) {
  if (!acceptHeader) return false;

  return acceptHeader.split(",").some(range => {
    const [mediaType, ...parameters] = range.split(";").map(value => value.trim());
    if (mediaType.toLowerCase() !== "text/markdown") return false;

    const quality = parameters.find(parameter => parameter.toLowerCase().startsWith("q="));
    return quality ? Number.parseFloat(quality.slice(2)) > 0 : true;
  });
}

export function estimateMarkdownTokens(markdown: string) {
  // A conservative transport-level estimate suitable for context-window planning.
  // It is intentionally labelled as an estimate rather than a tokenizer guarantee.
  return Math.max(1, Math.ceil(markdown.length / 4));
}

type MarkdownPage = {
  title: string;
  description: string;
  body: string;
};

const pages: Record<string, MarkdownPage> = {
  "/": {
    title: "Nodsend — Human approval infrastructure for AI agents",
    description: "Put a secure human checkpoint between agent intent and execution.",
    body: `# Human control for autonomous systems

Agents move fast. Decisions stay accountable.

Nodsend gives AI applications one approval API, signed outcomes, and a complete decision record. Your trusted server creates an approval request before a consequential side effect. An authorised person decides from a single-use link. Your application verifies the signed webhook and resumes the workflow.

## The decision circuit

1. **Agent proposes** — your application identifies an action that requires authority.
2. **Nodsend requests a decision** — one API request delivers the context to the right person.
3. **A human decides** — approval or rejection is atomic and bound to that request.
4. **Your application resumes** — a signed, replay-aware webhook carries the outcome.

## Production primitives

- Approval-bound, single-use decision tokens
- Atomic terminal decisions
- Registered webhook destinations with HMAC signatures
- Tenant-isolated API keys
- Durable audit history
- Python adapters for LangChain/LangGraph, CrewAI, and AutoGen

Nodsend records authority. It never executes the protected action or asks a model to police itself.

## Start

- [Developer documentation](${SITE_ORIGIN}/docs)
- [API catalog](${SITE_ORIGIN}/.well-known/api-catalog)
- [Create a workspace](${SITE_ORIGIN}/signup)
- [Pricing](${SITE_ORIGIN}/pricing)`,
  },
  "/docs": {
    title: "Nodsend developer documentation",
    description: "Build secure human approval checkpoints into any agent workflow.",
    body: `# Build a reliable human checkpoint

## Quick start

Create approvals from a trusted server. Never put an \`appr_live_\` API key in frontend code, a model prompt, or a public decision URL.

\`\`\`bash
curl ${API_ORIGIN}/v1/approvals \\
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
  }'
\`\`\`

## Required workflow controls

- Use a stable \`Idempotency-Key\` for create and cancel operations.
- Register webhook destinations in the dashboard; requests reference a \`webhook_id\`, not an arbitrary callback URL.
- Verify \`Nodsend-Webhook-Signature\` over \`<event_id>.<timestamp>.<raw_body>\` with HMAC-SHA256.
- Reject stale timestamps and duplicate event IDs before resuming a workflow.
- Keep the consequential side effect inside your trusted application.

## Framework adapters

The Python SDK includes adapters for LangChain/LangGraph interrupts, CrewAI feedback providers, and AutoGen approval-aware tools. The core REST API works with any framework.

## Machine-readable resources

- [OpenAPI 3.1 specification](${API_ORIGIN}/openapi.yaml)
- [API catalog](${SITE_ORIGIN}/.well-known/api-catalog)
- [Authentication and provisioning](${SITE_ORIGIN}/auth.md)`,
  },
  "/pricing": {
    title: "Nodsend pricing",
    description: "Nodsend is free and open source. 1,000 approval requests per month on the hosted version, or self-host for unlimited.",
    body: `# Pricing

Nodsend is free and open source, licensed under MIT.

## Free — $0 forever

Everything you need. No credit card.

- 1,000 approval requests per month
- Email decision delivery
- Signed webhook outcomes
- Decision audit history
- LangChain, CrewAI, and AutoGen adapters
- Python SDK
- Full OpenAPI spec
- 2FA account security

## Self-Host — $0, MIT licensed

Run Nodsend on your own infrastructure for unlimited approvals.

- Unlimited approval requests
- Everything in Free
- Docker Compose one-command setup
- Full source code access
- Deploy anywhere

[Create a workspace](${SITE_ORIGIN}/signup) or [view on GitHub](https://github.com/Foreveryoung2149/agent-approvals).`,
  },
  "/faq": {
    title: "Nodsend FAQ",
    description: "Answers about approvals, security, integrations, and operations.",
    body: `# Frequently asked questions

## What is Nodsend?

Nodsend is human approval infrastructure for AI agents. Your server creates a decision request, Nodsend presents it to an authorised person, and your workflow resumes from a signed outcome.

## Why is an agent-callable approval tool not enough?

A model may omit a tool call. The protected side effect must sit behind an application-enforced checkpoint that the model cannot bypass.

## Does the approver need an account?

No. Recipients use an opaque, single-use link scoped to one approval. Workspace authentication and human decision authority remain separate.

## How is a decision verified?

Nodsend signs webhook events with HMAC-SHA256. Verify the signature, timestamp, and event ID before resuming work.

## What if two people decide at once?

The state transition is atomic. Only the first valid pending-to-terminal transition succeeds.

## Does Nodsend execute the action?

No. Nodsend records authority; your trusted application owns execution.

## Which frameworks are supported?

The REST API works with any stack. Optional Python adapters support LangChain/LangGraph, CrewAI, and AutoGen.

[Read the documentation](${SITE_ORIGIN}/docs).`,
  },
  "/blog": {
    title: "Nodsend field notes",
    description: "Engineering notes on human authority, agent safety, and durable approval workflows.",
    body: `# Engineering accountable autonomy

Practical patterns for putting human authority into production agent systems.

${blogPosts.map(post => `- [${post.title}](${SITE_ORIGIN}/blog/${post.slug}) — ${post.description}`).join("\n")}

[Read the developer documentation](${SITE_ORIGIN}/docs).`,
  },
  "/contact": {
    title: "Contact Nodsend",
    description: "Talk to Nodsend about early access, architecture, enterprise requirements, or support.",
    body: `# Tell us where human judgment belongs

Whether you are testing one guarded tool or designing an enterprise control plane, start with the workflow and the consequence you need to protect.

Use the secure [contact form](${SITE_ORIGIN}/contact) or email [hello@nodsend.com](mailto:hello@nodsend.com). Do not send an API key, password, live approval token, or other credential.

Helpful context includes what the agent wants to do, who should decide, and what your application must do after the decision.`,
  },
  "/privacy": {
    title: "Nodsend Privacy Policy",
    description: "How Nodsend collects, uses, protects, and retains personal information.",
    body: `# Privacy Policy

Last updated: 8 August 2026.

This policy covers the Nodsend website, accounts, dashboard, APIs, approval requests, and support interactions. Nodsend uses information to provide and secure the service, authenticate users, deliver decision requests, record outcomes, provide support, monitor reliability, and comply with law.

Nodsend does not sell personal information and does not use approval content to train general-purpose AI models. Data is shared only with necessary service providers, advisers, integrations you direct, during a corporate transaction, or when required by law. Retention depends on data type, plan, configuration, legal duties, and security needs.

Depending on location, individuals may have rights to access, correct, delete, restrict, object to, or receive a copy of personal information. For the complete policy and all legal details, read the [browser version](${SITE_ORIGIN}/privacy). Privacy requests can be sent to [hello@nodsend.com](mailto:hello@nodsend.com).`,
  },
  "/terms": {
    title: "Nodsend Terms and Conditions",
    description: "Terms governing access to and use of the Nodsend human approval service.",
    body: `# Terms and Conditions

Last updated: 8 August 2026.

These terms cover the Nodsend website, dashboard, APIs, SDKs, decision pages, and related services. You are responsible for account security, lawful workflow configuration, authorised recipients, clear decision context, and safe handling of every lifecycle state.

Nodsend records human authority but does not execute the protected action. Your application remains responsible for verifying outcomes, enforcing idempotency, applying business rules, and deciding whether and how to act.

For the complete agreement, including plans, customer data, third-party services, intellectual property, availability, termination, disclaimers, liability, and governing law, read the [browser version](${SITE_ORIGIN}/terms). Questions can be sent to [hello@nodsend.com](mailto:hello@nodsend.com).`,
  },
};

function markdownBlogPost(post: BlogPost): MarkdownPage {
  const sections = post.sections.map(section => {
    const parts = [
      `## ${section.title}`,
      ...section.paragraphs,
    ];

    if (section.bullets?.length) {
      parts.push(section.bullets.map(item => `- ${item}`).join("\n"));
    }
    if (section.callout) {
      parts.push(`> **${section.callout.label}:** ${section.callout.text}`);
    }
    if (section.code) {
      parts.push(`**${section.code.label}**\n\n\`\`\`text\n${section.code.value}\n\`\`\``);
    }

    return parts.join("\n\n");
  }).join("\n\n");

  return {
    title: post.title,
    description: post.description,
    body: `# ${post.title}\n\n${post.tag} · Published ${post.publishedAt} · ${post.readingTime}\n\n${post.description}\n\n${sections}`,
  };
}

export function markdownForPath(pathname: string) {
  const blogPost = pathname.startsWith("/blog/")
    ? getBlogPost(pathname.slice("/blog/".length))
    : undefined;
  const page = pages[pathname] ?? (blogPost ? markdownBlogPost(blogPost) : null);

  if (!page) return null;

  const canonical = `${SITE_ORIGIN}${pathname === "/" ? "" : pathname}`;
  return `---\ntitle: ${JSON.stringify(page.title)}\ndescription: ${JSON.stringify(page.description)}\ncanonical: ${JSON.stringify(canonical)}\n---\n\n${page.body.trim()}\n`;
}
