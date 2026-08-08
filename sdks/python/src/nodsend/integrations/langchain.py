from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from ..errors import ApprovalNotGrantedError, OptionalDependencyError
from ..models import WebhookEvent


def _interrupt_value(interrupt: Any) -> Mapping[str, Any]:
    value = getattr(interrupt, "value", interrupt)
    if not isinstance(value, Mapping):
        raise TypeError("Expected a LangChain interrupt or interrupt value mapping.")
    return value


def approval_kwargs_from_interrupt(
    interrupt: Any,
    *,
    recipient: str,
    thread_id: str,
    webhook_id: str | None = None,
    expires_in: str = "1h",
) -> dict[str, Any]:
    """Translate a LangChain HITL interrupt into ``approvals.create`` kwargs.

    The application remains responsible for storing the approval-ID/thread-ID
    association in durable state. Nodsend never serializes a LangGraph object.
    """

    value = _interrupt_value(interrupt)
    actions = list(value.get("action_requests") or [])
    reviews = list(value.get("review_configs") or [])
    names = [str(action.get("name", "tool")) for action in actions if isinstance(action, Mapping)]
    action_name = names[0] if len(names) == 1 else "langchain.tool_batch"
    summary = (
        str(actions[0].get("description"))
        if len(actions) == 1 and isinstance(actions[0], Mapping) and actions[0].get("description")
        else f"Approve {len(actions)} LangChain tool call{'s' if len(actions) != 1 else ''}: {', '.join(names) or 'unknown tool'}"
    )
    return {
        "action": action_name,
        "summary": summary,
        "recipient": recipient,
        "details": {"action_requests": actions, "review_configs": reviews},
        "channel": "email",
        "expires_in": expires_in,
        "webhook_id": webhook_id,
        "external_id": f"langchain:{thread_id}",
        "metadata": {
            "integration": "langchain",
            "thread_id": thread_id,
            "decision_count": max(1, len(actions)),
        },
    }


def resume_payload_from_webhook(event: WebhookEvent, *, decision_count: int | None = None) -> dict[str, Any]:
    """Build the payload passed to ``Command(resume=...)`` from a verified event."""

    approval = event.approval
    if approval is None:
        raise ValueError("Webhook event does not contain an approval.")
    count = decision_count or int(approval.metadata.get("decision_count", 1))
    if approval.status == "approved":
        decisions = [{"type": "approve"} for _ in range(count)]
    elif approval.status == "rejected":
        message = approval.rejection_reason or "The reviewer rejected this action. Do not execute it."
        decisions = [{"type": "reject", "message": message} for _ in range(count)]
    else:
        raise ApprovalNotGrantedError(approval.id, approval.status, approval.rejection_reason)
    return {"decisions": decisions}


def command_from_webhook(event: WebhookEvent, *, decision_count: int | None = None) -> Any:
    """Return LangGraph's native ``Command`` without importing it at SDK startup."""

    try:
        from langgraph.types import Command
    except ImportError as exc:  # pragma: no cover - depends on optional package
        raise OptionalDependencyError(
            "Install the LangChain adapter with `pip install 'nodsend-ai[langchain]'`."
        ) from exc
    return Command(resume=resume_payload_from_webhook(event, decision_count=decision_count))
