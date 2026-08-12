# Microsoft Agent Framework design issue draft

Status: template only. Not submitted, accepted, or scheduled. Search current
issues and complete a public minimal prototype first.

Title:

```text
Proposal: extension pattern for durable external human approval of tool calls
```

Body:

```markdown
## Problem

Production agent applications sometimes need a consequential tool call to
pause, survive process restart, wait for a decision made in an external system,
and then resume exactly once. An application can build this around Agent
Framework today, but it is not clear which public extension point should own
the pause/resume and exact-action binding.

This is not a request to put vendor-specific code in Agent Framework. I am
seeking design guidance for a portable external approval pattern.

## Minimal prototype

Prototype: REPLACE_URL
Agent Framework version: REPLACE
Python/.NET version and OS: REPLACE
Reproduction: REPLACE_COMMANDS_OR_URL

The prototype:

1. intercepts a selected tool call before execution;
2. creates a durable external approval bound to the exact call and arguments;
3. persists the pending run;
4. consumes an approved decision once; and
5. rejects changed, expired, cancelled, or replayed decisions.

Evidence for approve, reject, process restart, retry, cancellation, and replay:
REPLACE_URL

## Design question

Which direction best matches Agent Framework's architecture?

1. Keep this entirely in a standalone adapter using existing public hooks.
2. Document a generic external-approval recipe around existing checkpoint and
   tool middleware APIs.
3. Discuss a small framework-owned extension interface before any API proposal.

I will not open a PR or propose a new public API until maintainers agree on a
direction and scope.

## Alternatives considered

- In-process confirmation: does not cover decisions delivered after process
  restart.
- Prompt-only approval: does not enforce the decision at the tool boundary.
- Polling without exact-call binding/idempotency: can authorize changed input or
  execute twice after retries.

## Affiliation and assistance

I maintain Nodsend, the external approval service used in the prototype. The
user problem and proposed extension pattern are intended to remain
vendor-neutral. REPLACE_WITH_ACCURATE_AI_ASSISTANCE_DISCLOSURE.
```

Pre-submit:

- [ ] No existing issue already covers the design.
- [ ] The prototype uses only released public APIs.
- [ ] Every claim links to evidence.
- [ ] The issue contains no credentials or live approval tokens.
- [ ] No implementation PR is opened before maintainer agreement.
