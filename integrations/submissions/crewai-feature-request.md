# CrewAI feature request draft

Status: template only. Not submitted or approved. Publish and validate the
provider before using this text.

Required labels: `feature-request`, `llm-generated`

Title:

```text
[FEATURE] Document an external async HumanFeedbackProvider example
```

Feature area: `Documentation` (or `Integration with external tools` if the
maintainers' current template better fits at submission time).

## Is your feature request related to an existing bug?

```markdown
N/A. This is a discoverability/documentation proposal for the existing async
`HumanFeedbackProvider` extension point.
```

## Describe the solution you'd like

```markdown
Would the maintainers be open to documenting one concise external-provider
pattern, or linking to a maintained provider example, for durable human
decisions that arrive through an external API?

The public `crewai-nodsend` package implements CrewAI's current
`HumanFeedbackProvider` contract. It raises `HumanFeedbackPending`, lets CrewAI
persist the flow, and resumes with deterministic `approved` or `rejected`
outcomes after a signed Nodsend decision. It does not require changes to CrewAI
core.

Minimal example: REPLACE_URL
Package: https://pypi.org/project/crewai-nodsend/REPLACE_VERSION/
Compatibility CI: REPLACE_URL
Restart/replay demo: REPLACE_URL

The proposed docs change, if maintainers want it, would explain the generic
provider pattern first and use Nodsend only as one runnable implementation.
I am asking for direction before preparing a PR.
```

## Alternatives considered

```markdown
- Console feedback: suitable for local interactive runs, but not an external
  asynchronous production decision.
- A custom callback outside the provider abstraction: loses CrewAI's native
  pending-flow persistence and resume contract.
- Documentation maintained only by Nodsend: already provided, but not
  discoverable to developers reading CrewAI's provider documentation.
```

## Additional context

```markdown
I maintain Nodsend and would maintain the external package and example. The
proposal is intentionally documentation/extension-point scoped and does not ask
CrewAI to own the integration.

This issue was prepared with an AI coding assistant, so I have applied CrewAI's
required `llm-generated` label.
```

Willingness to contribute: `I could provide more detailed specifications` until
maintainers approve a concrete PR scope.
