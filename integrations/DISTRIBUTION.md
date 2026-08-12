# Nodsend integration distribution kit

Status: internal launch plan. None of the upstream listings, issues, pull
requests, or ClawHub releases described here has been submitted or approved.
Do not describe an integration as official unless its host project does so.

This kit turns integration work into useful distribution without sending
maintainers promotional pull requests. The sequence is always:

1. solve a real framework-native problem;
2. publish a supported package with a reproducible demo;
3. collect evidence that it works; and
4. use the host project's current contribution path.

## Release evidence required before any submission

Every integration must have all of the following:

- [ ] A public, versioned package owned by Nodsend and installable from a clean
      environment.
- [ ] A framework-native API rather than a prompt convention or copied snippet.
- [ ] Tests against the oldest and newest framework versions claimed as
      supported.
- [ ] A runnable example covering approve, reject, expiry, network failure, and
      duplicate/replayed execution.
- [ ] Stable correlation and idempotency identifiers that bind the human
      decision to the exact pending action.
- [ ] Redaction of secrets and bounded approval payloads.
- [ ] Fail-closed behavior for protected actions, with a documented recovery
      path.
- [ ] Package docs that get a new user to one successful approval in 10 minutes
      or less, measured with at least three fresh installs.
- [ ] A 3-5 minute screen recording or terminal capture showing the complete
      pause, human decision, and safe resume path.
- [ ] A named maintenance owner, issue tracker, security contact, changelog, and
      supported-version policy.
- [ ] No unresolved critical/high security findings and no failing required CI.

Record the evidence URLs in the tracker below; do not replace missing evidence
with claims.

| Surface | Package / artifact | Evidence | Current state | Next allowed action |
| --- | --- | --- | --- | --- |
| LangChain | `langchain-nodsend` middleware | _TBD_ | Not published or listed | Complete package and release gates |
| CrewAI | `crewai-nodsend` `HumanFeedbackProvider` | _TBD_ | Not published or proposed upstream | Complete provider and release gates |
| OpenClaw | `@nodsend/openclaw` plugin | `integrations/openclaw/README.md` | Experimental; safe resume unresolved | Agree host-native resume contract |
| Microsoft Agent Framework | design proposal / adapter | _TBD_ | No issue or PR submitted | Validate minimal design, then file issue |

## 1. LangChain: external middleware listing

LangChain does **not** accept new integration code in its main repositories.
New integrations are standalone packages; after publication, the default
discovery route is a metadata-only PR to the LangChain docs repository. A full
hosted guide normally requires 50,000 monthly package downloads or maintainer
featured status.

Nodsend should ship a real `AgentMiddleware` package named
`langchain-nodsend`. The existing generic adapter is useful, but LangChain's
guidance lists adapters as discouraged and middleware as an encouraged
component. The middleware must gate the actual tool boundary and preserve
LangGraph resumability.

Submission checklist:

- [ ] `langchain-nodsend` is public on PyPI and the package name in the listing
      exactly matches the registry.
- [ ] `NodsendApprovalMiddleware` (final class name may change) uses current
      LangChain middleware hooks and passes applicable standard tests.
- [ ] Sync and async paths are tested with a persisted LangGraph thread.
- [ ] Docs show an end-to-end tool call, not only package initialization.
- [ ] The `docs_url` is public and contains install, configuration, security,
      and runnable usage guidance.
- [ ] Add one row under `python.middleware` in
      `scripts/data/integration_external_docs.yaml`; do not add an MDX guide or
      set featured status.
- [ ] The PR changes listing metadata only and does not include the package.
- [ ] If any PR prose is AI-assisted, follow LangChain's current LLM-use policy.

Ready-to-fill YAML and PR text:
[`submissions/langchain-external-listing.md`](submissions/langchain-external-listing.md).

Official sources:

- [Contributing integrations](https://docs.langchain.com/oss/python/contributing/integrations-langchain)
- [Publishing and listing an integration](https://docs.langchain.com/oss/python/contributing/publish-langchain)
- [Current external integration data](https://github.com/langchain-ai/docs/blob/main/scripts/data/integration_external_docs.yaml)

## 2. CrewAI: provider package, then an issue-first docs request

CrewAI has a native async human-feedback provider abstraction that pauses and
resumes flows. Nodsend's integration should implement that contract as a
standalone `crewai-nodsend` package and demonstrate persistence across process
restart. Do not submit a surprise package or broad documentation PR to CrewAI.
Once the package and evidence are public, open a focused feature request asking
maintainers whether and where an external provider example belongs.

CrewAI requires the `llm-generated` label on every issue or PR authored with an
AI agent or coding assistant. That includes documentation work.

Submission checklist:

- [ ] Implement and test CrewAI's current `HumanFeedbackProvider`,
      `HumanFeedbackPending`, and resume flow rather than returning approval
      prose to the model.
- [ ] Prove `approved` and `rejected` are deterministic routed outcomes.
- [ ] Prove a paused flow can resume after process restart without running the
      protected action twice.
- [ ] Publish `crewai-nodsend` and a minimal reproducible repository.
- [ ] Search existing CrewAI issues before filing.
- [ ] Use the Feature Request template and choose either "Integration with
      external tools" or "Documentation" as the area.
- [ ] Apply `llm-generated` and `feature-request` labels.
- [ ] Ask for maintainer direction; do not imply endorsement or demand a docs
      link.
- [ ] Open a code/docs PR only after maintainers agree on scope.

Ready-to-fill issue text:
[`submissions/crewai-feature-request.md`](submissions/crewai-feature-request.md).

Official sources:

- [Human feedback in CrewAI Flows](https://docs.crewai.com/en/learn/human-feedback-in-flows)
- [CrewAI contribution rules](https://github.com/crewAIInc/crewAI/blob/main/.github/CONTRIBUTING.md)
- [CrewAI feature request template](https://github.com/crewAIInc/crewAI/blob/main/.github/ISSUE_TEMPLATE/feature_request.yml)

## 3. OpenClaw: ClawHub only after safe host-native resume

The experimental plugin currently proves policy matching, redaction,
idempotent request creation, and fail-closed blocking. It intentionally does
not execute an approved call because OpenClaw's public hook contract has not
yet established a safe remote pause/resume handoff for this design. Publishing
before that is solved would advertise a non-working security control.

Production blocker checklist:

- [ ] Agree with OpenClaw maintainers on a host-native consume/resume primitive.
- [ ] Bind a single-use approval to exact tool id, canonical redacted arguments,
      requester/session identity, and tool-call id.
- [ ] Reject changed arguments, expired/cancelled decisions, and replayed
      decisions.
- [ ] Resume exactly once after Gateway restart and concurrent duplicate hook
      delivery.
- [ ] Pass supported-Gateway integration tests for approve, deny, timeout,
      cancellation, API failure, restart, and replay.
- [ ] Confirm hook timeout and cancellation behavior cannot continue a protected
      call after the plugin times out.

ClawHub publication checklist (only after every blocker above is complete):

- [ ] Make the source repository public and set a responsive maintenance owner.
- [ ] Select a ClawHub owner that controls the package scope; rename the package
      if `@nodsend` is not the selected owner.
- [ ] Remove `private: true` only when the artifact is ready for public install.
- [ ] Include `openclaw.plugin.json`, setup/usage docs, source repository and
      exact commit metadata, plus `openclaw.compat.pluginApi` and
      `openclaw.build.openclawVersion` in package metadata.
- [ ] Run `clawhub package validate <source>`.
- [ ] Run `clawhub package publish <source> --dry-run` and archive the output.
- [ ] Publish through ClawHub, then wait for security review and public
      verification before announcing availability.
- [ ] Verify `openclaw plugins install clawhub:<package-name>` from a clean
      supported Gateway.
- [ ] Use accurate categories/topics; never use reserved trust words such as
      `official`, `verified`, `endorsed`, or `trusted`.

Ready-to-fill release record:
[`submissions/openclaw-clawhub-release.md`](submissions/openclaw-clawhub-release.md).

Official sources:

- [OpenClaw plugin hooks](https://docs.openclaw.ai/plugins/hooks)
- [Community plugin discovery](https://docs.openclaw.ai/plugins/community)
- [ClawHub package publishing](https://docs.openclaw.ai/clawhub/publishing)
- [Plugin manifest](https://docs.openclaw.ai/plugins/manifest)

## 4. Microsoft Agent Framework: issue first, not AutoGen core

AutoGen is in maintenance mode and explicitly directs new feature development
to Microsoft Agent Framework. Keep the existing AutoGen adapter working for
current users, but do not seek a new AutoGen core feature.

Microsoft Agent Framework asks contributors not to surprise maintainers with a
large PR or create new APIs without prior discussion. The correct first step is
a small design issue with a runnable external prototype and a clear question:
should Nodsend remain a standalone adapter, be documented as a pattern, or
implement an agreed extension interface?

Issue checklist:

- [ ] Search existing issues and discussions for external approvals, HITL,
      checkpoint resume, and tool middleware.
- [ ] Build the smallest external prototype against a released Agent Framework
      version; do not fork framework internals.
- [ ] Demonstrate exact-action binding, persistence, cancellation, retry, and
      single execution.
- [ ] Include environment/version details and a minimal reproduction.
- [ ] State the user problem independently of Nodsend and disclose the author is
      Nodsend's maintainer.
- [ ] Ask for API/design direction before offering a PR.
- [ ] Do not open a PR unless an issue has agreement and scope.
- [ ] If invited, add tests and run the language-specific checks from the
      contribution guide.

Ready-to-fill issue text:
[`submissions/microsoft-agent-framework-proposal.md`](submissions/microsoft-agent-framework-proposal.md).

Official sources:

- [Microsoft Agent Framework contribution guide](https://github.com/microsoft/agent-framework/blob/main/CONTRIBUTING.md)
- [AutoGen maintenance notice](https://github.com/microsoft/autogen#autogen)

## 30-day founder-led launch sequence

This is a learning sequence, not a promise of virality. Optimize for activated
developers and maintainers' trust, not impressions.

### Days 1-3: establish a truthful baseline

- Publish a public compatibility table and define activation as: install the
  package, create an approval, make a decision, and resume exactly once.
- Capture current weekly unique installs, activated workspaces, successful
  approvals, time-to-first-approval, and support requests. Use `0` when data is
  unavailable; never invent a baseline.
- Recruit three design partners from existing human-approval discussions. Ask
  for a 20-minute implementation session, not a promotional post.

### Days 4-7: make the proof reproducible

- Complete one canonical sample application that can switch between local and
  hosted Nodsend and exercises approve, reject, expiry, retry, and replay.
- Run three clean-install usability sessions and reduce median time to first
  successful approval below 10 minutes.
- Publish the demo repository, short recording, threat model, and exact
  supported-version matrix.

### Days 8-14: earn LangChain discovery

- Finish and publish `langchain-nodsend` only after compatibility CI is green.
- Ask five LangChain users with relevant tool workflows to run the quickstart;
  fix every reproducible blocker before upstream contact.
- Submit the single metadata row to `langchain-ai/docs`. Do not request a hosted
  page, repeatedly tag maintainers, or bundle unrelated edits.

### Days 15-21: validate CrewAI and resolve OpenClaw architecture

- Publish the CrewAI provider and collect at least three successful external
  resume demonstrations.
- File the focused CrewAI feature request with the required `llm-generated`
  disclosure and respond to maintainer questions within one working day.
- Open an OpenClaw design discussion limited to the host-native resume blocker.
  Do not publish to ClawHub until the complete safety checklist passes.

### Days 22-30: expand carefully and report outcomes

- File the Microsoft Agent Framework design issue with the external prototype;
  leave AutoGen in compatibility-maintenance mode.
- Publish one technical article derived from measured behavior (for example,
  preventing duplicate execution after approval), not a generic launch post.
- Answer existing community questions only where Nodsend directly solves the
  reported problem. Disclose affiliation every time.
- Report: unique clean installs, activation rate, median time to first approval,
  completed approvals, replay attempts blocked, design-partner retention, and
  upstream review status.
- Choose the next 30 days from evidence: double down on the integration with
  activation and retained use, not the one with the most social impressions.

## Upstream conduct

- Never mass-open issues or paste the same pitch into multiple repositories.
- Never call a package "official," "approved," "verified," or "recommended"
  without explicit host-project confirmation.
- Lead with a reproducible user problem and evidence; mention Nodsend only as
  the implementation being proposed.
- Disclose founder/maintainer affiliation and AI assistance where required.
- One focused change per PR, green CI, prompt responses, and no repeated
  maintainer tagging.
- Close or revise a proposal when maintainers say the design does not fit.
