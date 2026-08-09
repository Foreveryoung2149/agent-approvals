export type BlogSection = {
  id: string;
  title: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
  callout?: {
    label: string;
    text: string;
  };
  code?: {
    label: string;
    value: string;
  };
};

export type BlogPost = {
  slug: string;
  sequence: string;
  tag: string;
  title: string;
  description: string;
  publishedAt: string;
  readingTime: string;
  sections: readonly BlogSection[];
};

export const blogPosts = [
  {
    slug: "approval-is-a-control-plane-concern",
    sequence: "01",
    tag: "Architecture",
    title: "Why approval is a control-plane concern",
    description:
      "A model asking itself for permission is not the same as an application-enforced decision boundary. Here is how to separate intent, authority, and execution.",
    publishedAt: "2026-08-09",
    readingTime: "8 min read",
    sections: [
      {
        id: "self-policing-is-not-a-boundary",
        title: "Self-policing is not a security boundary",
        paragraphs: [
          "Agent systems are good at proposing work. They can choose tools, construct arguments, and explain why an action appears reasonable. None of those capabilities grant authority to spend money, publish data, change production, or contact a customer.",
          "A prompt that says 'ask before deploying' is useful guidance, but guidance lives inside the same probabilistic system that selected the action. It can be omitted from context, weakened by later instructions, or bypassed by another execution path. A reliable checkpoint has to sit outside the model and before the side effect.",
          "That makes approval a control-plane concern. The application owns the policy, records the request, identifies the decision maker, and decides whether execution may resume. The model contributes intent and context, but it never becomes the authority that validates its own request.",
        ],
        callout: {
          label: "Design rule",
          text: "Treat model output as a proposal. Treat an authenticated, recorded human decision as authorization.",
        },
      },
      {
        id: "three-separate-responsibilities",
        title: "Separate intent, authorization, and execution",
        paragraphs: [
          "Production approval flows become easier to reason about when they are split into three explicit responsibilities. Each boundary should be observable and testable on its own.",
          "This separation prevents a common failure mode: treating an approval response as a loose chat message. A durable decision should name the exact action it authorizes and be correlated to the workflow that will consume it. If the action changes materially, the old decision should not silently authorize the new one.",
        ],
        bullets: [
          "Intent: the agent describes the proposed action, its reason, and the minimum context a person needs to decide.",
          "Authorization: the control plane creates an immutable approval request and accepts one terminal decision from an authorized recipient.",
          "Execution: the worker validates that decision, checks that it still applies, and performs the side effect with its own idempotency protection.",
        ],
      },
      {
        id: "approval-contract",
        title: "Make the approval request a contract",
        paragraphs: [
          "An approval record should be useful to the human, the resuming workflow, and the audit trail. That means carrying a stable action name, a plain-language summary, an authorized recipient, an expiry, and a durable external identifier. Add only the non-sensitive context required to make the decision.",
          "The request also needs lifecycle rules. Pending is not the same as approved. Expired is not rejected. Cancellation by the application is different from a decision by the recipient. Explicit states make retries and incident review far less ambiguous.",
        ],
        code: {
          label: "Example request",
          value: `POST /v1/approvals\nAuthorization: Bearer appr_live_...\nIdempotency-Key: deploy-prod-1042\n\n{\n  "action": "deploy_production",\n  "summary": "Release version 4.2 to production",\n  "recipient": "owner@company.com",\n  "external_id": "release-1042"\n}`,
        },
      },
      {
        id: "failure-modes",
        title: "Design the unhappy paths first",
        paragraphs: [
          "The value of a control plane shows up when normal assumptions fail. A user can click twice. A webhook can arrive twice or out of order. A job can restart after the decision is recorded but before the side effect completes. An approval can expire while a worker is offline.",
          "Build invariants for those cases instead of relying on timing. Only one terminal decision should win. Every event should have a stable identifier and a verifiable signature. The consumer should record processed event IDs and make the final action idempotent. Expired or cancelled requests must fail closed.",
        ],
        bullets: [
          "Never put a reusable API credential in a model prompt or a human decision link.",
          "Never let a webhook body alone prove that a decision is authentic.",
          "Never resume a consequential workflow without checking the approval ID, action, status, and correlation data.",
          "Never assume a successful approval means the downstream side effect already happened.",
        ],
      },
      {
        id: "production-checklist",
        title: "A practical production checklist",
        paragraphs: [
          "Before placing a checkpoint in front of a real side effect, test the boundary as if every surrounding system were unreliable. Retry the create request. Race approve and reject. Replay a signed event. Restart the consumer between receipt and execution. Change the proposed action after approval and confirm that execution is refused.",
          "A good approval layer does not make an agent less capable. It gives the system a clear place to transfer authority, preserve accountability, and resume safely. That is what allows teams to automate consequential work without pretending the model is also the policy engine.",
        ],
      },
    ],
  },
  {
    slug: "durable-human-input-across-agent-frameworks",
    sequence: "02",
    tag: "Integrations",
    title: "Durable human input across agent frameworks",
    description:
      "LangGraph interrupts, CrewAI feedback providers, and guarded AutoGen tools expose different extension points. The approval lifecycle underneath them should remain the same.",
    publishedAt: "2026-08-09",
    readingTime: "9 min read",
    sections: [
      {
        id: "frameworks-differ-lifecycle-does-not",
        title: "Frameworks differ; the lifecycle does not",
        paragraphs: [
          "Agent frameworks use different language for human involvement. A graph pauses at an interrupt. A crew asks for feedback. A function tool can be wrapped before it runs. Those are useful integration points, but they are not a complete approval system by themselves.",
          "The durable lifecycle is consistent: capture intent, create an external approval, persist the workflow correlation, wait without holding an in-memory process open, verify the decision event, and resume exactly the work that requested it. Treating that lifecycle as an adapter boundary keeps policy and audit behavior consistent when teams change frameworks.",
        ],
        callout: {
          label: "Adapter principle",
          text: "Translate framework state into one approval contract, then translate the verified outcome back into the framework's native resume mechanism.",
        },
      },
      {
        id: "langgraph",
        title: "LangGraph: correlate the approval with the checkpoint",
        paragraphs: [
          "A durable graph already has a useful primitive: a checkpointed thread that can pause and resume. The integration should create the approval at the interrupt boundary and attach the thread identifier as correlation data. The process can then stop; it does not need to poll or keep a worker alive.",
          "When the signed decision event arrives, load the stored correlation, verify that the approval is terminal and applies to the expected action, then resume that exact thread. Avoid resolving a thread by email address or display text. Those values are helpful to people but are not durable workflow identifiers.",
        ],
        bullets: [
          "Persist the approval ID beside the graph checkpoint before returning control.",
          "Use an idempotency key derived from the thread and interrupt so a retry returns the same approval.",
          "Resume only after the webhook signature and replay window have been verified.",
        ],
      },
      {
        id: "crewai",
        title: "CrewAI: keep feedback outside the execution loop",
        paragraphs: [
          "Human feedback in a crew can shape planning, review intermediate work, or authorize a tool. Only the last case is a security boundary. If the feedback decides whether a consequential action may happen, move it to an external provider that records a durable request and returns a structured decision.",
          "The crew should not infer approval from free-form prose such as 'looks good.' Feed a typed approved or rejected outcome back into the flow and preserve the approval ID in the task output. That makes later behavior explainable and prevents another agent from reinterpreting the human response.",
        ],
      },
      {
        id: "autogen",
        title: "AutoGen: guard the function that owns the side effect",
        paragraphs: [
          "For function-oriented agents, place the checkpoint around the narrowest tool that can cause the side effect. A deploy function, refund function, or outbound-message function should not be callable through an unguarded alias elsewhere in the tool registry.",
          "The wrapper can create the approval from validated function arguments and return a pending result to the conversation. After approval, a trusted worker executes the original function using the stored arguments. This prevents the model from changing parameters between the human decision and execution.",
        ],
        code: {
          label: "Framework-neutral lifecycle",
          value: `intent = validate(tool_arguments)\napproval = request_approval(intent, correlation_id)\npersist(checkpoint, approval.id, intent)\n\n# Later, after a verified decision event\nstate = load_checkpoint(approval.id)\nassert decision.action == state.intent.action\nresume_or_execute(state, decision)`,
        },
      },
      {
        id: "one-policy-surface",
        title: "Keep one policy surface across every adapter",
        paragraphs: [
          "Framework-specific adapters should be intentionally thin. They should know how to extract a summary, correlation ID, and resume handle. They should not each invent expiry behavior, recipient rules, signature verification, or audit semantics.",
          "Centralizing those concerns gives platform teams one place to answer operational questions: Who approved this? Which version of the action did they see? Did a retry create another request? Which event resumed the workflow? A consistent control plane turns three framework integrations into one governable system instead of three special cases.",
        ],
        bullets: [
          "Use the same action vocabulary across frameworks for reporting and policy.",
          "Keep sensitive credentials in the application boundary, never in agent state.",
          "Test every adapter against the same duplicate, expiry, rejection, and cancellation scenarios.",
          "Expose the approval ID in logs so framework traces and decision history can be joined.",
        ],
      },
    ],
  },
  {
    slug: "exactly-once-starts-with-an-atomic-decision",
    sequence: "03",
    tag: "Operations",
    title: "Exactly once starts with an atomic decision",
    description:
      "Concurrent clicks, network retries, and repeated events should never execute a consequential action twice. Design for duplicates at every boundary.",
    publishedAt: "2026-08-09",
    readingTime: "8 min read",
    sections: [
      {
        id: "duplicates-are-normal",
        title: "Duplicates are normal operating conditions",
        paragraphs: [
          "Approval workflows cross browsers, email clients, APIs, queues, and workers. Every boundary can retry. A person can double-click a decision button, a client can repeat a timed-out create request, and a webhook provider can redeliver an event after the receiver committed its work but lost the response.",
          "Trying to remove every duplicate is unrealistic. Production systems become reliable by making duplicates safe. That starts with an atomic decision, continues through idempotent event delivery, and ends with a side effect that has its own deduplication boundary.",
        ],
        callout: {
          label: "Operational invariant",
          text: "At-least-once delivery is acceptable when every consumer can prove that the same logical action is applied no more than once.",
        },
      },
      {
        id: "one-terminal-decision",
        title: "Allow one terminal decision to win",
        paragraphs: [
          "Approve and reject can arrive nearly simultaneously from separate tabs or devices. The decision store must transition the record from pending to one terminal state in a single conditional operation. If the record is no longer pending, the later request returns the existing outcome rather than overwriting it.",
          "This rule belongs in the database transaction, not only in a disabled button. Interface controls improve the experience, but they cannot coordinate concurrent requests or a replayed HTTP call.",
        ],
        code: {
          label: "State transition invariant",
          value: `UPDATE approvals\nSET status = 'approved', decided_at = NOW()\nWHERE id = :approval_id\n  AND status = 'pending';\n\n-- Exactly one row means this request won.\n-- Zero rows means return the existing terminal state.`,
        },
      },
      {
        id: "idempotent-creation",
        title: "Give creation requests a stable identity",
        paragraphs: [
          "A create call can succeed even when the caller never receives the response. Without an idempotency key, retrying may email the same person twice and produce two valid approval records for one workflow action.",
          "Derive a key from the durable operation identity, not from a random value created on each attempt. Store a hash of the normalized request body with the key. Reusing the same key and body returns the original approval; reusing it with a different body should fail as a conflict. That protects callers from accidental parameter drift.",
        ],
        bullets: [
          "Choose keys that identify the business operation, such as deploy-prod-1042 or refund-order-9281.",
          "Keep the same key across network retries and worker restarts.",
          "Reject the same key with materially different recipient, action, or context fields.",
        ],
      },
      {
        id: "webhook-inbox",
        title: "Treat webhook delivery as an inbox",
        paragraphs: [
          "A signed webhook proves where an event came from; it does not prove that your application has not handled it before. Record the stable event ID in an inbox table under a unique constraint. Verify the signature and timestamp against the raw body, then insert the ID and apply the local transition in the same transaction where possible.",
          "A duplicate event should receive a successful response after confirming it was already handled. Returning an error invites more retries without improving correctness. Keep enough event metadata to explain which delivery caused a workflow to resume.",
        ],
        bullets: [
          "Verify HMAC signatures with a constant-time comparison.",
          "Reject events outside the accepted replay window.",
          "Use the provider event ID, not a hash of mutable JSON formatting, as the deduplication key.",
          "Queue execution after recording the event so slow side effects do not block delivery acknowledgement.",
        ],
      },
      {
        id: "last-mile",
        title: "Protect the last mile too",
        paragraphs: [
          "An atomic approval does not automatically make the resulting deploy, refund, or message exactly once. The worker can fail after calling the downstream system but before recording success. Pass the same business idempotency key to downstream APIs that support one, or store an execution ledger around systems that do not.",
          "Track approval status and execution status separately. Approved means a human authorized the action; it does not mean the action completed. This distinction gives operators truthful recovery options and prevents a retry from asking for a second approval when only execution needs to resume.",
        ],
        callout: {
          label: "Audit question",
          text: "For every consequential action, you should be able to identify the approval, the winning decision request, the delivery event, and the execution attempt.",
        },
      },
      {
        id: "test-the-races",
        title: "Test the races deliberately",
        paragraphs: [
          "Happy-path tests rarely expose duplicate execution. Add concurrency tests that submit approve and reject together, repeat create requests with the same idempotency key, deliver the same webhook many times, and crash a worker after the downstream call but before its local commit.",
          "Exactly-once is not a single feature. It is a chain of explicit identities, atomic transitions, and idempotent consumers. When each boundary has a defined invariant, retries stop being incidents and become a normal recovery mechanism.",
        ],
      },
    ],
  },
] as const satisfies readonly BlogPost[];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

export function getAdjacentBlogPosts(slug: string): {
  previous?: BlogPost;
  next?: BlogPost;
} {
  const index = blogPosts.findIndex((post) => post.slug === slug);

  if (index === -1) {
    return {};
  }

  return {
    previous: blogPosts[index - 1],
    next: blogPosts[index + 1],
  };
}
