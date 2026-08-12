from __future__ import annotations

from collections.abc import Collection
from typing import Any, Literal

from .._client import Nodsend
from ..errors import OptionalDependencyError
from ..models import WebhookEvent
from ._serialization import DEFAULT_SENSITIVE_KEYS, safe_json_value, stable_operation_key

try:  # Optional by design; importing this module must remain safe.
    from crewai.flow import HumanFeedbackPending, HumanFeedbackProvider
except ImportError:  # pragma: no cover - exercised in an environment without CrewAI
    HumanFeedbackPending = None  # type: ignore[assignment,misc]
    HumanFeedbackProvider = object  # type: ignore[assignment,misc]


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
        sensitive_keys: Collection[str] = DEFAULT_SENSITIVE_KEYS,
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
        self.sensitive_keys = sensitive_keys

    def request_feedback(self, context: Any, flow: Any) -> str:
        del flow
        safe_output = safe_json_value(context.method_output, sensitive_keys=self.sensitive_keys)
        operation_key = stable_operation_key(
            "crewai",
            context.flow_id,
            context.method_name,
            context.requested_at.isoformat(),
        )
        approval = self.client.approvals.create(
            action=f"crewai.{context.method_name}",
            summary=context.message or f"Review CrewAI flow step {context.method_name}",
            recipient=self.recipient,
            details={
                "flow_class": context.flow_class,
                "method_name": context.method_name,
                "output": safe_output,
                "allowed_outcomes": list(context.emit or []),
            },
            webhook_id=self.webhook_id,
            expires_in=self.expires_in,
            agent_name=self.agent_name,
            external_id=operation_key,
            metadata={"integration": "crewai", "flow_id": context.flow_id},
            idempotency_key=operation_key,
        )
        raise HumanFeedbackPending(
            context=context,
            callback_info={"approval_id": approval.id, "flow_id": context.flow_id},
        )


def feedback_from_webhook(event: WebhookEvent) -> Literal["approved", "rejected"]:
    """Return the exact CrewAI routing outcome for a verified decision.

    Rejection reasons remain available on ``event.approval`` for audit and UI
    use. They are deliberately not passed to ``flow.resume``: free-form text
    makes CrewAI invoke an LLM to collapse the response and can route a rejected
    action incorrectly. These exact outcome strings make resumption deterministic.
    """

    approval = event.approval
    if approval is None:
        raise ValueError("Webhook event does not contain an approval.")
    if approval.status == "approved":
        return "approved"
    if approval.status == "rejected":
        return "rejected"
    raise ValueError(f"Approval {approval.id} is not a resumable decision: {approval.status}")
