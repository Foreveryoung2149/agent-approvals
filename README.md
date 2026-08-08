# Nodsend

Nodsend is human approval infrastructure for AI agents. It creates a durable checkpoint between model intent and a consequential side effect, delivers the decision to an authorized person, and resumes the workflow through a signed outcome event.

The repository contains:

- a Next.js marketing site and authenticated operations console;
- an Express and PostgreSQL approval API;
- opaque, single-use public decision requests;
- HMAC-signed webhook delivery with persistent retries;
- an OpenAPI 3.1 contract;
- a typed Python SDK with optional LangChain, CrewAI, and AutoGen adapters.

## Security boundary

An agent or its API key can create, read, list, and cancel approval requests. It cannot approve its own request. Human decisions use a separate public route with an opaque token that is hashed at rest and bound to a single approval. Terminal state changes are atomic, and webhook outcomes must be verified before a protected action executes.

## Local development

Requirements:

- Node.js 22+
- PostgreSQL
- Python 3.10+ for SDK development

Install dependencies:

```bash
npm ci
cp .env.example .env
```

Set `DATABASE_URL`, then generate the Prisma client and apply migrations:

```bash
npm run db:generate
npm run db:migrate
```

Run the web app and API together:

```bash
npm run dev:all
```

- Web: `http://localhost:3000`
- API: `http://localhost:3002`
- Health: `http://localhost:3002/health`

## Required production configuration

Production startup fails closed when required secrets are absent. Generate unique, high-entropy values for:

- `DATABASE_URL`
- `SESSION_SECRET`
- `AUTH_CODE_PEPPER`
- `TOTP_ENCRYPTION_KEY`
- `RESEND_API_KEY`
- `FROM_EMAIL`
- `APP_URL`
- `CORS_ORIGIN`

Do not configure `DEV_API_KEY` in production. Run committed Prisma migrations with `prisma migrate deploy`; never use `db push --accept-data-loss` in a production start command.

### Deployment notes

- Run PostgreSQL with automated backups and deploy migrations before accepting traffic.
- Approval email and webhook outcomes use durable database outboxes; API workers can recover leased deliveries after a process restart.
- The built-in request and authentication rate limits are process-local. Run one API replica or enforce a shared limit at the gateway until a distributed limiter is configured.
- Send application logs and `/health` results to your monitoring platform, and alert on repeated `delivery_failed` audit events.

## API shape

Agent routes use `Authorization: Bearer appr_live_...`:

```text
POST /v1/approvals
GET  /v1/approvals
GET  /v1/approvals/:id
POST /v1/approvals/:id/cancel
GET  /v1/approvals/:id/logs
```

Human decision links use the token-scoped public API:

```text
GET  /v1/decision-requests/:id?token=...
POST /v1/decision-requests/:id/decision?token=...
```

The canonical contract is [openapi/nodsend.openapi.yaml](openapi/nodsend.openapi.yaml).

## Python SDK

The package source lives in [`sdks/python`](sdks/python). For repository development:

```bash
python -m venv .venv
. .venv/bin/activate
pip install -e "sdks/python[dev]"
pytest sdks/python/tests
```

Framework dependencies are optional extras. See [`sdks/README.md`](sdks/README.md) for LangChain, CrewAI, and AutoGen integration guidance. The protected side effect should stay behind the adapter; a model-callable “request approval” helper is not sufficient as the security boundary.

## Verification

```bash
npm run typecheck
npm run test:api
npm run build
npm audit --omit=dev
npm run test:sdk
```

## Current product scope

Email is the supported decision-delivery channel. Additional channels, paid billing, enterprise identity, and compliance certifications must not be advertised as available until their complete security and operational lifecycle is implemented.
