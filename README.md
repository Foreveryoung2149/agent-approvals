<div align="center">

<img src="https://nodsend.com/icon.svg" width="64" height="64" alt="Nodsend logo" />

# Nodsend

**Human approval infrastructure for consequential AI-agent actions.**

One API request. An authorized person decides. Your workflow resumes from a
signed, replay-aware outcome.

[![Production CI](https://github.com/Foreveryoung2149/Nodsend/actions/workflows/ci.yml/badge.svg)](https://github.com/Foreveryoung2149/Nodsend/actions/workflows/ci.yml)
[![PyPI](https://img.shields.io/pypi/v/nodsend-ai.svg)](https://pypi.org/project/nodsend-ai/)
[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/Foreveryoung2149/Nodsend?style=social)](https://github.com/Foreveryoung2149/Nodsend)

[Website](https://nodsend.com) | [Documentation](https://nodsend.com/docs) |
[OpenAPI](https://api.nodsend.com/openapi.yaml) |
[Python SDK](https://pypi.org/project/nodsend-ai/)

</div>

---

## Why Nodsend

Agents can draft refunds, deploy software, send messages, or move money. The
model deciding to call a second "approval" tool is not a security boundary:
the consequential operation itself must be unable to run until approval has
been granted.

Nodsend provides that external decision boundary:

```text
Agent or workflow -> Nodsend approval -> Authorized human
Agent or workflow <- Signed outcome  <- Approve or reject
```

- Approval links are bound to one request and stored as hashes.
- Terminal decisions are atomic, so only one outcome can win.
- Webhooks are signed, timestamped, replay-aware, and retried.
- Stable idempotency keys prevent duplicate requests across retries.
- Every lifecycle event is available as an audit trail.

## 30-second API quickstart

Create a server-side API key in the Nodsend dashboard, then send an approval:

```bash
curl -X POST https://api.nodsend.com/v1/approvals \
  -H "Authorization: Bearer appr_live_..." \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: release-4.2-production" \
  -d '{
    "action": "deploy_production",
    "summary": "Release version 4.2 to production",
    "channel": "email",
    "recipient": "owner@company.com",
    "expires_in": "1h",
    "external_id": "release-4.2"
  }'
```

The recipient receives a single-use decision link. Your application can poll
the approval or resume from a verified webhook.

## Python SDK

```bash
python -m pip install nodsend-ai

# Install only the framework extras you use.
python -m pip install "nodsend-ai[langchain]"
python -m pip install "nodsend-ai[crewai]"
python -m pip install "nodsend-ai[autogen]"
```

```python
import os

from nodsend import Nodsend

with Nodsend(api_key=os.environ["NODSEND_API_KEY"]) as nodsend:
    approval = nodsend.approvals.create(
        action="deploy_production",
        summary="Release version 4.2 to production",
        recipient="owner@company.com",
        external_id="release-4.2",
        idempotency_key="release-4.2-production",
    )

    decision = nodsend.approvals.require_approved(
        approval.id,
        timeout=1800,
        poll_interval=2,
    )

    # The protected side effect belongs after the approval check.
    deploy_release("4.2")
```

The async client exposes the same resource shape through `AsyncNodsend`.

## Framework integrations

Nodsend uses each framework's native pause or tool boundary. It does not ask
the model to remember to request approval.

### LangChain and LangGraph

Use LangChain's `HumanInTheLoopMiddleware` with a durable LangGraph
checkpointer. Translate the interrupt into a Nodsend request, persist the
approval-to-thread correlation in your database, and resume only after the
webhook has passed signature and replay verification.

```python
from nodsend.integrations.langchain import (
    approval_kwargs_from_interrupt,
    command_from_webhook,
)

approval = nodsend.approvals.create(
    **approval_kwargs_from_interrupt(
        interrupt,
        recipient="owner@company.com",
        thread_id=thread_id,
        webhook_id=webhook_id,
    )
)

# In a verified webhook worker:
agent.invoke(command_from_webhook(event), config=config, version="v2")
```

### CrewAI

`NodsendFeedbackProvider` implements CrewAI's non-blocking human-feedback
provider contract. CrewAI persists the pending Flow; your verified webhook
handler restores and resumes it.

```python
from nodsend import Nodsend
from nodsend.integrations.crewai import NodsendFeedbackProvider

provider = NodsendFeedbackProvider(
    Nodsend(),
    recipient="owner@company.com",
    webhook_id=webhook_id,
)

# Pass provider to CrewAI's @human_feedback(...) gate.
```

### AutoGen

Wrap the consequential callable itself. The wrapper creates an approval and
does not execute the function body until the result is approved.

```python
from nodsend import AsyncNodsend
from nodsend.integrations.autogen import function_tool

deploy_tool = function_tool(
    deploy_production,
    client=AsyncNodsend(),
    recipient="owner@company.com",
    action="deploy_production",
    summary="Deploy version 4.2 to production",
    description="Deploy only after mandatory human approval.",
    idempotency_key=lambda args: f"deploy:{args['version']}",
)
```

See [the Python SDK guide](sdks/python/README.md) for complete examples and
webhook verification.

## Integration maturity

| Surface | Status | Notes |
|---|---|---|
| REST API and OpenAPI | Available | Canonical contract at `openapi/nodsend.openapi.yaml` |
| `nodsend-ai` Python SDK | Alpha | Typed sync/async clients, published on PyPI |
| LangChain / LangGraph | Alpha | Native interrupt translation and resume command |
| CrewAI | Alpha | Native non-blocking human-feedback provider |
| AutoGen | Compatibility | Guarded `FunctionTool`; AutoGen itself is in maintenance mode |
| OpenClaw | In development | Tool-boundary plugin intended for ClawHub |

Alpha integrations should be validated against your own persistence, timeout,
and retry requirements before production use.

## Webhook verification

Always verify the exact raw request body before parsing it. The signature base
is:

```text
<event_id>.<unix_timestamp>.<raw_request_body>
```

```python
from nodsend import verify_webhook

event = verify_webhook(raw_body, request_headers, webhook_secret)
```

Persist `event.event_id` behind a unique constraint before resuming a workflow.
Nodsend webhook delivery is at least once.

## Security boundary

Nodsend can enforce a decision only when your application keeps the protected
side effect behind the approval-aware wrapper or resume path. Do not:

- expose API keys or webhook secrets to a model, browser, or prompt;
- place passwords, tokens, private keys, or raw regulated data in `details`;
- execute a side effect from an unverified webhook;
- treat a model-callable "request approval" helper as the gate;
- use an in-memory checkpointer for a workflow that must survive restarts.

Read the [security model](https://nodsend.com/docs#security) before connecting a
production action.

## Self-host

```bash
git clone https://github.com/Foreveryoung2149/Nodsend.git
cd Nodsend
docker compose up
```

- Web application: `http://localhost:3000`
- API server: `http://localhost:3002`
- Health check: `http://localhost:3002/health`

Before a production deployment, set independent strong values for
`SESSION_SECRET`, `AUTH_CODE_PEPPER`, and `TOTP_ENCRYPTION_KEY`; configure a
verified `FROM_EMAIL`; and review every variable in [.env.example](.env.example).

## API resources

| Endpoint | Purpose |
|---|---|
| `POST /v1/approvals` | Create an approval request |
| `GET /v1/approvals` | List approvals with cursor pagination |
| `GET /v1/approvals/:id` | Retrieve one approval |
| `POST /v1/approvals/:id/cancel` | Cancel a pending approval |
| `GET /v1/approvals/:id/logs` | Retrieve its audit log |

The complete contract is the [OpenAPI 3.1 document](openapi/nodsend.openapi.yaml).

## Local development

```bash
# Prerequisites: Node.js 22+, Python 3.10+, and PostgreSQL 16+
npm ci
cp .env.example .env

npm run prisma:generate
npm run prisma:migrate:deploy
npm run dev:all
```

Run the main verification suites with:

```bash
npm run test:api
npm run typecheck
npm run build
npm run test:sdk
```

See [CONTRIBUTING.md](CONTRIBUTING.md) before opening an issue or pull request.

## License

[MIT](LICENSE)
