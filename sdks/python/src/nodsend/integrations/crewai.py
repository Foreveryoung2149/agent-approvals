from __future__ import annotations

import json
from typing import Any

from .._client import Nodsend
from ..errors import OptionalDependencyError
from ..models import WebhookEvent

try:  # Optional by design; importing this module must remain safe.
    from crewai.flow import HumanFeedbackPending, HumanFeedbackProvider
except ImportError:  # pragma: no cover - exercised in an environment without CrewAI
    HumanFeedbackPending = None  # type: ignore[assignment,misc]
    HumanFeedbackProvider = object  # type: ignore[assignment,misc]


def _jsonable(value: Any) -> Any:
    try:
        json.dumps(value)
        return value
    except (TypeError, ValueError):
        return repr(value)


class NodsendFeedbackProvider(HumanFeedbackProvider):  # type: ignore[misc,valid-type]
    """Non-blocking CrewAI Flow provider backed by a Nodsend approval.

    CrewAI persists the pending flow after ``HumanFeedbackPending`` is raised.
    Resume that flow from a verified Nodsend webhook in your own webhook handler.
    """

    def __init__(
        self,
        client: Nodsend,
        *,
        recipient: str,
        webhook_id: str | None = None,
        expires_in: str = "1h",
        agent_name: str = "CrewAI flow",
    ) -> None:
        if HumanFeedbackPending is None:
            raise OptionalDependencyError(
                "Install the CrewAI adapter with `pip install 'nodsend-ai[crewai]'`."
            )
        self.client = client
        self.recipient = recipient
        self.webhook_id = webhook_id
        self.expires_in = expires_in
        self.agent_name = agent_name

    def request_feedback(self, context: Any, flow: Any) -> str:
        del flow
        approval = self.client.approvals.create(
            action=f"crewai.{context.method_name}",
            summary=context.message or f"Review CrewAI flow step {context.method_name}",
            recipient=self.recipient,
            details={
                "flow_class": context.flow_class,
                "method_name": context.method_name,
                "output": _jsonable(context.method_output),
                "allowed_outcomes": list(context.emit or []),
            },
            webhook_id=self.webhook_id,
            expires_in=self.expires_in,
            agent_name=self.agent_name,
            external_id=f"crewai:{context.flow_id}",
            metadata={"integration": "crewai", "flow_id": context.flow_id},
            idempotency_key=f"crewai:{context.flow_id}:{context.method_name}:{context.requested_at.isoformat()}",
        )
        raise HumanFeedbackPending(
            context=context,
            callback_info={"approval_id": approval.id, "flow_id": context.flow_id},
        )


def feedback_from_webhook(event: WebhookEvent) -> str:
    """Convert a verified Nodsend event into the value supplied to ``flow.resume``."""

    approval = event.approval
    if approval is None:
        raise ValueError("Webhook event does not contain an approval.")
    if approval.status == "approved":
        return "approved"
    if approval.status == "rejected":
        return approval.rejection_reason or "rejected"
    raise ValueError(f"Approval {approval.id} is not a resumable decision: {approval.status}")
