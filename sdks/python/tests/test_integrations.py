from __future__ import annotations

import asyncio
import importlib
from datetime import datetime, timezone
from typing import Any

import pytest

from conftest import approval_payload
from nodsend.errors import ApprovalNotGrantedError
from nodsend.integrations.autogen import guard_callable
from nodsend.integrations.crewai import feedback_from_webhook
from nodsend.integrations.langchain import (
    approval_kwargs_from_interrupt,
    resume_payload_from_webhook,
)
from nodsend.models import Approval, WebhookEvent


def test_optional_adapter_modules_are_safe_to_import() -> None:
    for module in (
        "nodsend.integrations.langchain",
        "nodsend.integrations.crewai",
        "nodsend.integrations.autogen",
    ):
        assert importlib.import_module(module) is not None


def _event(
    status: str,
    *,
    decision_count: int = 1,
    rejection_reason: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> WebhookEvent:
    raw = {
        "event_id": "evt_test123",
        "event_type": f"approval.{status}",
        "created_at": "2026-08-08T18:00:00Z",
        "data": {
            "approval": approval_payload(
                status=status,
                metadata=metadata or {"decision_count": decision_count},
                rejection_reason=rejection_reason,
            )
        },
    }
    return WebhookEvent.from_dict(raw)


def _batch_interrupt() -> dict[str, Any]:
    return {
        "action_requests": [
            {
                "name": "send_email",
                "args": {
                    "to": "ops@example.com",
                    "authorization": "Bearer never-send-this",
                    "nested": {"apiKey": "also-secret"},
                },
                "description": "Email the operations team",
            },
            {"name": "deploy", "args": {"environment": "production"}},
        ],
        "review_configs": [
            {"action_name": "send_email", "allowed_decisions": ["approve", "reject"]},
            {"action_name": "deploy", "allowed_decisions": ["approve", "reject"]},
        ],
    }


def test_langchain_adapter_redacts_arguments_and_preserves_batch_decisions() -> None:
    kwargs = approval_kwargs_from_interrupt(
        _batch_interrupt(),
        recipient="reviewer@example.com",
        thread_id="thread-42",
        interrupt_id="interrupt-7",
    )
    arguments = kwargs["details"]["action_requests"][0]["args"]
    assert arguments["authorization"] == "[REDACTED]"
    assert arguments["nested"]["apiKey"] == "[REDACTED]"
    assert "never-send-this" not in repr(kwargs)
    assert kwargs["external_id"].startswith("langchain:")
    assert kwargs["metadata"]["decision_count"] == 2
    assert kwargs["metadata"]["allowed_decisions"] == [
        ["approve", "reject"],
        ["approve", "reject"],
    ]
    assert resume_payload_from_webhook(
        _event(
            "approved",
            metadata={
                "decision_count": 2,
                "allowed_decisions": [["approve", "reject"], ["approve", "reject"]],
            },
        )
    ) == {"decisions": [{"type": "approve"}, {"type": "approve"}]}


def test_langchain_adapter_builds_stable_but_interrupt_specific_idempotency_keys() -> None:
    first = approval_kwargs_from_interrupt(
        _batch_interrupt(),
        recipient="reviewer@example.com",
        thread_id="thread-42",
        interrupt_id="interrupt-7",
    )
    replay = approval_kwargs_from_interrupt(
        _batch_interrupt(),
        recipient="reviewer@example.com",
        thread_id="thread-42",
        interrupt_id="interrupt-7",
    )
    next_interrupt = approval_kwargs_from_interrupt(
        _batch_interrupt(),
        recipient="reviewer@example.com",
        thread_id="thread-42",
        interrupt_id="interrupt-8",
    )
    assert first["idempotency_key"] == replay["idempotency_key"]
    assert first["external_id"] == replay["external_id"]
    assert first["idempotency_key"] != next_interrupt["idempotency_key"]


def test_langchain_mapping_fallback_is_content_stable() -> None:
    first = approval_kwargs_from_interrupt(
        _batch_interrupt(), recipient="reviewer@example.com", thread_id="thread-42"
    )
    replay = approval_kwargs_from_interrupt(
        _batch_interrupt(), recipient="reviewer@example.com", thread_id="thread-42"
    )
    assert first["idempotency_key"] == replay["idempotency_key"]


@pytest.mark.parametrize(
    ("mutate", "match"),
    [
        (lambda value: value.update(action_requests=[]), "no action requests"),
        (lambda value: value.update(review_configs=[]), "same length"),
        (
            lambda value: value["review_configs"][0].update(action_name="wrong_tool"),
            "does not match",
        ),
        (
            lambda value: value["review_configs"][0].update(allowed_decisions=["approve"]),
            "requires both",
        ),
    ],
)
def test_langchain_adapter_rejects_ambiguous_batches(mutate: Any, match: str) -> None:
    interrupt = _batch_interrupt()
    mutate(interrupt)
    with pytest.raises(ValueError, match=match):
        approval_kwargs_from_interrupt(
            interrupt, recipient="reviewer@example.com", thread_id="thread-42"
        )


def test_langchain_resume_rejects_invalid_counts_and_disallowed_outcomes() -> None:
    with pytest.raises(ValueError, match="between 1 and 100"):
        resume_payload_from_webhook(_event("approved", decision_count=0))
    with pytest.raises(ApprovalNotGrantedError, match="not allowed"):
        resume_payload_from_webhook(
            _event(
                "approved",
                metadata={"decision_count": 1, "allowed_decisions": [["reject"]]},
            )
        )


def test_langchain_native_interrupt_and_command_compatibility() -> None:
    langgraph_types = pytest.importorskip("langgraph.types")
    native = langgraph_types.Interrupt(_batch_interrupt(), id="native-interrupt-9")
    kwargs = approval_kwargs_from_interrupt(
        native, recipient="reviewer@example.com", thread_id="thread-native"
    )
    assert kwargs["metadata"]["batch_reference"].startswith("id:")
    assert "native-interrupt-9" not in repr(kwargs)

    from nodsend.integrations.langchain import command_from_webhook

    command = command_from_webhook(_event("approved", decision_count=2))
    assert isinstance(command, langgraph_types.Command)
    assert command.resume == {"decisions": [{"type": "approve"}, {"type": "approve"}]}


@pytest.mark.parametrize(
    ("status", "reason", "expected"),
    [
        ("approved", None, "approved"),
        ("rejected", "Do not deploy this release", "rejected"),
    ],
)
def test_crewai_feedback_is_a_deterministic_routing_outcome(
    status: str, reason: str | None, expected: str
) -> None:
    assert feedback_from_webhook(_event(status, rejection_reason=reason)) == expected


def test_crewai_native_provider_raises_native_pending_signal() -> None:
    crewai_flow = pytest.importorskip("crewai.flow")
    from nodsend.integrations.crewai import NodsendFeedbackProvider

    calls: list[dict[str, Any]] = []

    class FakeApprovals:
        def create(self, **kwargs: Any) -> Approval:
            calls.append(kwargs)
            return Approval.from_dict(approval_payload())

    class FakeClient:
        approvals = FakeApprovals()

    class SensitiveResult:
        def __repr__(self) -> str:
            return "super-secret-repr"

    context = crewai_flow.PendingFeedbackContext(
        flow_id="flow-42",
        flow_class="tests.ReviewFlow",
        method_name="review_release",
        method_output={
            "release": 42,
            "api_key": "super-secret-key",
            "result": SensitiveResult(),
        },
        message="Review release 42",
        emit=["approved", "rejected"],
        requested_at=datetime(2026, 8, 8, 18, 0, tzinfo=timezone.utc),
    )
    provider = NodsendFeedbackProvider(
        FakeClient(), recipient="reviewer@example.com"  # type: ignore[arg-type]
    )
    with pytest.raises(crewai_flow.HumanFeedbackPending) as raised:
        provider.request_feedback(context, object())
    assert raised.value.callback_info == {"approval_id": "apr_test123", "flow_id": "flow-42"}
    assert calls[0]["idempotency_key"].startswith("crewai:")
    assert calls[0]["external_id"] == calls[0]["idempotency_key"]
    assert calls[0]["details"]["output"]["release"] == 42
    assert calls[0]["details"]["output"]["api_key"] == "[REDACTED]"
    assert calls[0]["details"]["output"]["result"].startswith("<test_integrations.")
    assert "super-secret" not in repr(calls[0])

    with pytest.raises(crewai_flow.HumanFeedbackPending):
        provider.request_feedback(context, object())
    assert calls[0]["idempotency_key"] == calls[1]["idempotency_key"]


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


def test_autogen_default_key_is_stable_and_arguments_are_redacted() -> None:
    calls: list[dict[str, Any]] = []

    class FakeApprovals:
        async def create(self, **kwargs: Any) -> Approval:
            calls.append(kwargs)
            return Approval.from_dict(approval_payload())

        async def require_approved(self, approval_id: str, **kwargs: Any) -> Approval:
            return Approval.from_dict(approval_payload(status="approved"))

    class FakeClient:
        approvals = FakeApprovals()

    class SensitiveArgument:
        def __repr__(self) -> str:
            return "never-serialize-this-secret"

    async def invoke(environment: str, config: dict[str, Any]) -> str:
        return environment

    guarded = guard_callable(
        invoke,
        client=FakeClient(),  # type: ignore[arg-type]
        recipient="reviewer@example.com",
        summary="Deploy through AutoGen",
    )
    first_config = {
        "authorization": "Bearer secret-one",
        "opaque": SensitiveArgument(),
    }
    second_config = {
        "authorization": "Bearer secret-two",
        "opaque": SensitiveArgument(),
    }
    assert asyncio.run(guarded("production", first_config)) == "production"
    assert asyncio.run(guarded("production", second_config)) == "production"
    assert asyncio.run(guarded("staging", first_config)) == "staging"

    safe_arguments = calls[0]["details"]["arguments"]
    assert safe_arguments["environment"] == "production"
    assert safe_arguments["config"]["authorization"] == "[REDACTED]"
    assert safe_arguments["config"]["opaque"].startswith("<test_integrations.")
    assert "secret" not in repr(calls[0])
    assert calls[0]["idempotency_key"] == calls[1]["idempotency_key"]
    assert calls[0]["external_id"] == calls[0]["idempotency_key"]
    assert calls[0]["idempotency_key"] != calls[2]["idempotency_key"]


def test_autogen_native_function_tool_executes_through_approval_gate() -> None:
    autogen_core = pytest.importorskip("autogen_core")
    pytest.importorskip("autogen_core.tools")
    from nodsend.integrations.autogen import function_tool

    class FakeApprovals:
        async def create(self, **kwargs: Any) -> Approval:
            return Approval.from_dict(approval_payload())

        async def require_approved(self, approval_id: str, **kwargs: Any) -> Approval:
            return Approval.from_dict(approval_payload(status="approved"))

    class FakeClient:
        approvals = FakeApprovals()

    executed: list[str] = []

    def deploy(environment: str) -> str:
        executed.append(environment)
        return f"deployed:{environment}"

    tool = function_tool(
        deploy,
        client=FakeClient(),  # type: ignore[arg-type]
        recipient="reviewer@example.com",
        summary="Deploy through AutoGen",
        description="Deploy an environment after human approval.",
    )

    async def run() -> Any:
        return await tool.run_json(
            {"environment": "production"}, autogen_core.CancellationToken()
        )

    assert asyncio.run(run()) == "deployed:production"
    assert executed == ["production"]
