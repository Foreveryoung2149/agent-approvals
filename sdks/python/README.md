# Nodsend Python SDK

Typed sync and async clients for Nodsend human approval workflows. Framework
packages are optional: installing the core SDK does not install an agent runtime.

> Status: pre-release. This SDK targets the hardened API contract in
> `openapi/nodsend.openapi.yaml`; it is not compatible with the repository's
> original prototype API until the server-side contract migration is complete.

## Install from this repository

```bash
python -m pip install ./sdks/python
```

The distribution has not been published to PyPI yet. Once it is released, the
package name will be `nodsend-ai`. Framework runtimes are not installed by the
core package. To develop against an optional adapter from this repository:

```bash
python -m pip install './sdks/python[langchain]'
python -m pip install './sdks/python[crewai]'
python -m pip install './sdks/python[autogen]'
```

## Core client

```python
import os
from nodsend import Nodsend

with Nodsend(api_key=os.environ["NODSEND_API_KEY"]) as client:
    approval = client.approvals.create(
        action="send_customer_refund",
        summary="Refund order #1842 for $79.00",
        details={"order_id": 1842, "amount": 79},
        recipient="operator@example.com",
        expires_in="30m",
        # Reuse your workflow's stable operation ID across retries.
        idempotency_key="refund:1842:v1",
    )

    decision = client.approvals.require_approved(
        approval.id,
        timeout=1800,
        poll_interval=2,
    )
    # Execute the consequential action only after this line.
```

The async API has the same resource shape:

```python
from nodsend import AsyncNodsend

async with AsyncNodsend() as client:  # reads NODSEND_API_KEY
    approval = await client.approvals.create(
        action="deploy_production",
        summary="Deploy release 2026.08.08 to production",
        recipient="oncall@example.com",
    )
    decision = await client.approvals.wait(approval.id, timeout=3600)
```

`create()` and `cancel()` always send an idempotency key. Supply a stable key
from your workflow if a process restart may repeat the same logical operation.
GET requests and idempotent writes retry transient network errors, HTTP 408,
429, and selected 5xx responses. Non-idempotent writes are never retried.

Treat API keys and webhook secrets as server-side credentials. Approval
`details` and `metadata` are transmitted to Nodsend and may appear in reviewer
and audit views; never place passwords, private keys, access tokens, or raw
regulated data in either field.

## Verify webhooks

Always pass the exact raw request body, before JSON parsing:

```python
from nodsend import verify_webhook

event = verify_webhook(
    raw_request_body,
    request_headers,
    os.environ["NODSEND_WEBHOOK_SECRET"],
)

if event.event_type == "approval.approved":
    resume_workflow(event)
```

The verifier uses a timing-safe signature comparison and rejects timestamps
outside five minutes by default. Persist `event.event_id` behind a unique
constraint and pass an atomic `replay_guard` callback if the handler may receive
duplicates. Nodsend webhooks are at-least-once delivery.

## LangChain / LangGraph

Use LangChain's native `HumanInTheLoopMiddleware` and a persistent checkpointer.
Nodsend transports the interrupt to the reviewer; LangGraph remains responsible
for pausing and resuming graph state.

```python
from langchain.agents import create_agent
from langchain.agents.middleware import HumanInTheLoopMiddleware
from nodsend.integrations.langchain import (
    approval_kwargs_from_interrupt,
    command_from_webhook,
)

agent = create_agent(
    model=model,
    tools=[send_email],
    middleware=[HumanInTheLoopMiddleware(
        interrupt_on={"send_email": {"allowed_decisions": ["approve", "reject"]}},
    )],
    checkpointer=postgres_checkpointer,
)

config = {"configurable": {"thread_id": thread_id}}
result = agent.invoke(input, config=config, version="v2")
if result.interrupts:
    approval = nodsend.approvals.create(**approval_kwargs_from_interrupt(
        result.interrupts[0],
        recipient="operator@example.com",
        thread_id=thread_id,
        webhook_id=webhook_id,
    ))
    # Persist approval.id -> thread_id in your application database.

# In a webhook worker, after verify_webhook(...):
agent.invoke(command_from_webhook(event), config=config, version="v2")
```

Do not use an in-memory checkpointer in production. Do not resume a thread until
the webhook has passed signature and replay verification.

## CrewAI

`NodsendFeedbackProvider` implements CrewAI's native non-blocking feedback
provider contract. CrewAI persists the pending flow; your verified webhook
handler restores and resumes it.

```python
from crewai.flow import Flow, human_feedback, start
from nodsend import Nodsend
from nodsend.integrations.crewai import NodsendFeedbackProvider, feedback_from_webhook

provider = NodsendFeedbackProvider(
    Nodsend(),
    recipient="operator@example.com",
    webhook_id=webhook_id,
)

class ReleaseFlow(Flow):
    @start()
    @human_feedback(
        message="Approve this production release?",
        emit=["approved", "rejected"],
        llm="gpt-4o-mini",
        default_outcome="rejected",
        provider=provider,
    )
    def release_plan(self):
        return {"version": "2026.08.08", "environment": "production"}

# In a verified webhook worker:
flow = ReleaseFlow.from_pending(event.approval.metadata["flow_id"])
flow.resume(feedback_from_webhook(event))
```

Make the webhook handler idempotent. `feedback_from_webhook` intentionally
rejects pending, expired, and cancelled events.

## AutoGen

Guard the consequential callable itself. A separate model-callable
`request_approval` tool can be skipped by the model and is not a security gate.

```python
from autogen_agentchat.agents import AssistantAgent
from nodsend import AsyncNodsend
from nodsend.integrations.autogen import function_tool

async def send_wire(amount: int, account: str) -> str:
    return await bank.send_wire(amount=amount, account=account)

wire_tool = function_tool(
    send_wire,
    client=AsyncNodsend(),
    recipient="finance@example.com",
    action="send_wire",
    summary=lambda args: f"Send ${args['amount']} to {args['account']}",
    description="Send a bank wire after mandatory human approval.",
    idempotency_key=lambda args: f"wire:{workflow_id}:{args['account']}:{args['amount']}",
)

agent = AssistantAgent(
    "finance_agent",
    model_client=model_client_configured_with_parallel_tool_calls_disabled,
    tools=[wire_tool],
)
```

This bounded-wait adapter is suitable when the AutoGen worker may remain alive
while approval is pending. For long waits, persist AutoGen state and resume it
from a verified webhook rather than holding a worker open.

## Development

```bash
cd sdks/python
python -m pip install -e '.[dev]'
pytest
```
