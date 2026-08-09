<div align="center">

<img src="https://nodsend.com/icon.svg" width="64" height="64" alt="Nodsend logo" />

# Nodsend

**Human approval infrastructure for AI agents.**

One API call. A human decides. You get a signed webhook.

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/Foreveryoung2149/agent-approvals?style=social)](https://github.com/Foreveryoung2149/agent-approvals)

[Website](https://nodsend.com) · [Docs](https://nodsend.com/docs) · [OpenAPI Spec](https://api.nodsend.com/openapi.yaml) · [Python SDK](sdks/python)

</div>

---

## The Problem

AI agents are getting autonomous. They book flights, deploy code, send money, email clients. But **who checks before they act?**

Most teams either skip the check (dangerous), build a custom solution (fragile), or use `input()` (doesn't work in production).

## The Solution

Nodsend puts a secure human checkpoint between agent intent and execution.

```
Agent → POST /v1/approvals → Human gets email → Clicks Approve → Agent gets webhook → Continues
```

That's the entire product. No SDKs to learn, no dashboards to configure, no infrastructure to manage.

## 30-Second Quickstart

```bash
curl -X POST https://api.nodsend.com/v1/approvals \
  -H "Authorization: Bearer appr_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "action": "deploy_production",
    "summary": "Release v4.2 to production",
    "channel": "email",
    "recipient": "ceo@company.com",
    "expires_in": "1h"
  }'
```

The human gets a clean email with **Approve** and **Reject** buttons. They click. You get a signed webhook. Done.

## Framework Integrations

### LangChain / LangGraph

```python
from nodsend.integrations.langchain import NodsendApprovalTool

tool = NodsendApprovalTool(api_key="appr_live_...")

# Inside your agent
result = tool.invoke({
    "action": "send_invoice",
    "summary": "Send $5,000 invoice to Acme Corp",
    "recipient": "finance@company.com"
})
```

### CrewAI

```python
from nodsend.integrations.crewai import NodsendFeedbackProvider

provider = NodsendFeedbackProvider(api_key="appr_live_...")

# Attach to your crew
crew = Crew(
    agents=[...],
    tasks=[...],
    human_input=True,
    feedback_provider=provider
)
```

### AutoGen

```python
from nodsend.integrations.autogen import NodsendApprovalTool

tool = NodsendApprovalTool(api_key="appr_live_...")

# Register with your AutoGen agent
agent.register_tool(tool)
```

### Any Framework (REST)

```python
import requests

resp = requests.post(
    "https://api.nodsend.com/v1/approvals",
    headers={"Authorization": "Bearer appr_live_..."},
    json={
        "action": "book_flight",
        "summary": "Book SFO→JFK for $350, Aug 15",
        "channel": "email",
        "recipient": "ceo@company.com",
        "expires_in": "1h",
    },
)
```

## How It Works

```
┌──────────────┐     POST /v1/approvals     ┌──────────────┐
│              │ ──────────────────────────▸ │              │
│  Your Agent  │                            │   Nodsend    │
│              │ ◂────────────────────────── │              │
└──────────────┘     Signed Webhook          └──────┬───────┘
                                                    │
                                              Email │ Approve / Reject
                                                    │
                                             ┌──────▾───────┐
                                             │    Human     │
                                             │  Decision    │
                                             └──────────────┘
```

1. **Agent calls the API** — sends the action, summary, and recipient
2. **Human gets an email** — clean, one-click Approve/Reject buttons
3. **Agent gets a webhook** — HMAC-SHA256 signed, tamper-proof

## Features

- 🔐 **Approval-bound tokens** — single-use, hashed at rest
- ⚡ **One API call** — no SDK required, works with any language
- 🔏 **Signed webhooks** — HMAC-SHA256 with replay protection
- 📋 **Full audit trail** — every event logged, queryable via API
- ⏰ **Auto-expiry** — approvals expire if no one responds
- 🔒 **Security boundary** — agents can't approve their own requests
- 🐍 **Python SDK** — with LangChain, CrewAI, and AutoGen adapters
- 🌐 **Self-hostable** — MIT licensed, run it on your own infrastructure

## Self-Host in One Command

```bash
git clone https://github.com/Foreveryoung2149/agent-approvals.git
cd agent-approvals
docker compose up
```

That's it. PostgreSQL, the API server, and the web dashboard all start together.

- **Web dashboard:** http://localhost:3000
- **API server:** http://localhost:3002
- **Health check:** http://localhost:3002/health

> **Production:** Generate real secrets for `SESSION_SECRET`, `AUTH_CODE_PEPPER`, and `TOTP_ENCRYPTION_KEY`. See [.env.example](.env.example) for all configuration options.

## Deploy to Cloud

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/template/nodsend)

Or deploy anywhere that runs Docker — Render, Fly.io, AWS ECS, Google Cloud Run, your own VPS.

## Python SDK

Install from source (PyPI coming soon):

```bash
pip install -e "sdks/python"

# With framework integrations
pip install -e "sdks/python[langchain]"
pip install -e "sdks/python[crewai]"
pip install -e "sdks/python[autogen]"
```

```python
from nodsend import NodsendClient

client = NodsendClient(api_key="appr_live_...")

# Create an approval
approval = client.approvals.create(
    action="deploy_production",
    summary="Release v4.2 to production",
    channel="email",
    recipient="ceo@company.com",
    expires_in="1h",
)

# Check status
status = client.approvals.get(approval.id)
```

See the [SDK documentation](sdks/python/README.md) for the full API.

## API Reference

| Endpoint | Description |
|---|---|
| `POST /v1/approvals` | Create an approval request |
| `GET /v1/approvals` | List approvals |
| `GET /v1/approvals/:id` | Get approval details |
| `POST /v1/approvals/:id/cancel` | Cancel a pending approval |
| `GET /v1/approvals/:id/logs` | Get audit log |

Full specification: [OpenAPI 3.1](openapi/nodsend.openapi.yaml)

## Architecture

| Component | Tech | Description |
|---|---|---|
| **Web App** | Next.js 16 | Marketing site + dashboard |
| **API Server** | Express 5 | Approval lifecycle, webhooks, auth |
| **Database** | PostgreSQL | Approvals, users, API keys, audit log |
| **Email** | Resend | Approval request delivery |
| **Python SDK** | Python 3.10+ | Client library with framework adapters |

## Local Development

```bash
# Prerequisites: Node.js 22+, PostgreSQL

npm ci
cp .env.example .env

# Configure DATABASE_URL in .env, then:
npm run db:generate
npm run db:migrate

# Start web + API together
npm run dev:all
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full development guide.

## Contributing

We welcome contributions! Whether it's bug reports, feature requests, documentation improvements, or code — check out our [Contributing Guide](CONTRIBUTING.md) to get started.

## License

[MIT](LICENSE) — use it however you want.

## Links

- 🌐 [nodsend.com](https://nodsend.com)
- 📖 [Documentation](https://nodsend.com/docs)
- 📋 [OpenAPI Spec](https://api.nodsend.com/openapi.yaml)
- 🐍 [Python SDK](sdks/python)
- 💬 [Report an Issue](https://github.com/Foreveryoung2149/agent-approvals/issues)
