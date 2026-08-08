from __future__ import annotations

import asyncio
import importlib
from typing import Any

from conftest import approval_payload
from nodsend.integrations.autogen import guard_callable
from nodsend.integrations.langchain import approval_kwargs_from_interrupt, resume_payload_from_webhook
from nodsend.models import Approval, WebhookEvent


def test_optional_adapter_modules_are_safe_to_import() -> None:
    for module in (
        "nodsend.integrations.langchain",
        "nodsend.integrations.crewai",
        "nodsend.integrations.autogen",
    ):
        assert importlib.import_module(module) is not None


def _event(status: str, *, decision_count: int = 1) -> WebhookEvent:
    raw = {
        "event_id": "evt_test123",
        "event_type": f"approval.{status}",
        "created_at": "2026-08-08T18:00:00Z",
        "data": {
            "approval": approval_payload(
                status=status,
                metadata={"decision_count": decision_count},
            )
        },
    }
    return WebhookEvent.from_dict(raw)


def test_langchain_adapter_preserves_native_interrupt_decisions() -> None:
    interrupt = {
        "action_requests": [
            {"name": "send_email", "args": {"to": "ops@example.com"}},
            {"name": "deploy", "args": {"environment": "production"}},
        ],
        "review_configs": [
            {"action_name": "send_email", "allowed_decisions": ["approve", "reject"]},
            {"action_name": "deploy", "allowed_decisions": ["approve", "reject"]},
        ],
    }
    kwargs = approval_kwargs_from_interrupt(
        interrupt,
        recipient="reviewer@example.com",
        thread_id="thread-42",
    )
    assert kwargs["external_id"] == "langchain:thread-42"
    assert kwargs["metadata"]["decision_count"] == 2
    assert resume_payload_from_webhook(_event("approved", decision_count=2)) == {
        "decisions": [{"type": "approve"}, {"type": "approve"}]
    }


def test_autogen_guard_gates_the_consequential_callable() -> None:
    calls: list[tuple[str, Any]] = []

    class FakeApprovals:
        async def create(self, **kwargs: Any) -> Approval:
            calls.append(("create", kwargs))
            return Approval.from_dict(approval_payload())

        async def require_approved(self, approval_id: str, **kwargs: Any) -> Approval:
            calls.append(("require_approved", {"approval_id": approval_id, **kwargs}))
            return Approval.from_dict(approval_payload(status="approved"))

    class FakeClient:
        approvals = FakeApprovals()

    executed: list[str] = []

    def deploy(environment: str) -> str:
        executed.append(environment)
        return f"deployed:{environment}"

    guarded = guard_callable(
        deploy,
        client=FakeClient(),  # type: ignore[arg-type]
        recipient="reviewer@example.com",
        summary=lambda args: f"Deploy to {args['environment']}",
        idempotency_key=lambda args: f"deploy:{args['environment']}",
    )
    result = asyncio.run(guarded("production"))
    assert result == "deployed:production"
    assert [name for name, _ in calls] == ["create", "require_approved"]
    assert executed == ["production"]
    assert calls[0][1]["idempotency_key"] == "deploy:production"
