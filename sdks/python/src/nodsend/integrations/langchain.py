from __future__ import annotations

import hashlib
import re
from collections.abc import Collection, Mapping, Sequence
from typing import Any

from ..errors import ApprovalNotGrantedError, OptionalDependencyError
from ..models import WebhookEvent
from ._serialization import (
    DEFAULT_SENSITIVE_KEYS,
    MAX_STRING_LENGTH,
    TRUNCATED,
    safe_json_value,
    stable_fingerprint,
)

_MAX_BATCH_SIZE = 100
_PLACEHOLDER_INTERRUPT_IDS = frozenset({"", "placeholder-id"})
_ACTION_CHARACTER = re.compile(r"[^A-Za-z0-9_.:-]+")


def _interrupt_value(interrupt: Any) -> Mapping[str, Any]:
    value = getattr(interrupt, "value", interrupt)
    if not isinstance(value, Mapping):
        raise TypeError("Expected a LangChain interrupt or interrupt value mapping.")
    return value


def _validated_batch(value: Mapping[str, Any]) -> tuple[list[Mapping[str, Any]], list[Mapping[str, Any]]]:
    raw_actions = value.get("action_requests")
    raw_reviews = value.get("review_configs")
    if not isinstance(raw_actions, Sequence) or isinstance(raw_actions, (str, bytes, bytearray)):
        raise TypeError("LangChain interrupt action_requests must be a sequence.")
    if not isinstance(raw_reviews, Sequence) or isinstance(raw_reviews, (str, bytes, bytearray)):
        raise TypeError("LangChain interrupt review_configs must be a sequence.")
    if not raw_actions:
        raise ValueError("LangChain interrupt contains no action requests.")
    if len(raw_actions) > _MAX_BATCH_SIZE:
        raise ValueError(f"LangChain interrupt exceeds the {_MAX_BATCH_SIZE}-action batch limit.")
    if len(raw_actions) != len(raw_reviews):
        raise ValueError("LangChain action_requests and review_configs must have the same length.")

    actions: list[Mapping[str, Any]] = []
    reviews: list[Mapping[str, Any]] = []
    for index, (action, review) in enumerate(zip(raw_actions, raw_reviews, strict=True)):
        if not isinstance(action, Mapping) or not isinstance(review, Mapping):
            raise TypeError(f"LangChain batch item {index} must contain mapping values.")
        name = action.get("name")
        if not isinstance(name, str) or not name.strip():
            raise ValueError(f"LangChain action request {index} has no valid name.")
        if review.get("action_name") != name:
            raise ValueError(f"LangChain review config {index} does not match action {name!r}.")
        decisions = review.get("allowed_decisions")
        if not isinstance(decisions, Sequence) or isinstance(decisions, (str, bytes, bytearray)):
            raise TypeError(f"LangChain review config {index} has no allowed_decisions sequence.")
        allowed = {str(decision) for decision in decisions}
        if "approve" not in allowed or "reject" not in allowed:
            raise ValueError(
                "Nodsend requires both 'approve' and 'reject' in every LangChain "
                f"review config; action {name!r} allows {sorted(allowed)!r}."
            )
        actions.append(action)
        reviews.append(review)
    return actions, reviews


def _action_name(name: str) -> str:
    normalized = _ACTION_CHARACTER.sub("_", name.strip()).strip("_") or "tool"
    return normalized[:200]


def _batch_reference(interrupt: Any, value: Mapping[str, Any], explicit_id: str | None) -> str:
    native_id = getattr(interrupt, "id", None)
    candidate = explicit_id if explicit_id is not None else native_id
    if candidate is not None and str(candidate).strip() not in _PLACEHOLDER_INTERRUPT_IDS:
        return f"id:{stable_fingerprint(str(candidate))}"
    return f"content:{stable_fingerprint(value)}"


def approval_kwargs_from_interrupt(
    interrupt: Any,
    *,
    recipient: str,
    thread_id: str,
    webhook_id: str | None = None,
    expires_in: str = "1h",
    interrupt_id: str | None = None,
    sensitive_keys: Collection[str] = DEFAULT_SENSITIVE_KEYS,
) -> dict[str, Any]:
    """Translate a LangChain HITL interrupt into ``approvals.create`` kwargs.

    Arguments are recursively converted to bounded JSON and common credential
    fields are redacted before leaving the process. The returned idempotency key
    is stable for a native LangGraph interrupt ID. Plain request mappings fall
    back to a content fingerprint; pass ``interrupt_id`` when an identical batch
    can legitimately occur more than once in the same thread.

    The application remains responsible for storing the approval-ID/thread-ID
    association in durable state. Nodsend never serializes a LangGraph object.
    """

    if not isinstance(thread_id, str) or not thread_id.strip():
        raise ValueError("thread_id must be a non-empty string.")
    value = _interrupt_value(interrupt)
    actions, reviews = _validated_batch(value)
    names = [str(action["name"]).strip() for action in actions]
    safe_actions = safe_json_value(actions, sensitive_keys=sensitive_keys)
    safe_reviews = safe_json_value(reviews, sensitive_keys=sensitive_keys)
    action_name = _action_name(names[0]) if len(names) == 1 else "langchain.tool_batch"
    summary_names = ", ".join(names)
    summary = f"Approve {len(actions)} LangChain tool call{'s' if len(actions) != 1 else ''}: {summary_names}"
    if len(summary) > 500:
        summary = f"{summary[:485]}...{TRUNCATED}"

    reference = _batch_reference(interrupt, value, interrupt_id)
    operation_digest = hashlib.sha256(f"{thread_id}\0{reference}".encode("utf-8")).hexdigest()
    allowed_decisions = [list(dict.fromkeys(str(item) for item in review["allowed_decisions"])) for review in reviews]
    return {
        "action": action_name,
        "summary": summary,
        "recipient": recipient,
        "details": {"action_requests": safe_actions, "review_configs": safe_reviews},
        "channel": "email",
        "expires_in": expires_in,
        "webhook_id": webhook_id,
        "external_id": f"langchain:{operation_digest}",
        "idempotency_key": f"langchain:{operation_digest}",
        "metadata": {
            "integration": "langchain",
            "thread_id": thread_id[:MAX_STRING_LENGTH],
            "batch_reference": reference[:255],
            "decision_count": len(actions),
            "allowed_decisions": allowed_decisions,
        },
    }


def _decision_count(approval_metadata: Mapping[str, Any], override: int | None) -> int:
    raw = override if override is not None else approval_metadata.get("decision_count", 1)
    if isinstance(raw, bool):
        raise ValueError("decision_count must be a positive integer.")
    try:
        count = int(raw)
    except (TypeError, ValueError) as exc:
        raise ValueError("decision_count must be a positive integer.") from exc
    if count < 1 or count > _MAX_BATCH_SIZE:
        raise ValueError(f"decision_count must be between 1 and {_MAX_BATCH_SIZE}.")
    return count


def _assert_decision_allowed(metadata: Mapping[str, Any], decision: str, count: int) -> None:
    configured = metadata.get("allowed_decisions")
    if configured is None:
        return
    if not isinstance(configured, Sequence) or isinstance(configured, (str, bytes, bytearray)):
        raise ValueError("Approval metadata contains invalid allowed_decisions.")
    if len(configured) != count:
        raise ValueError("Approval decision_count does not match allowed_decisions metadata.")
    for index, allowed in enumerate(configured):
        if not isinstance(allowed, Sequence) or isinstance(allowed, (str, bytes, bytearray)):
            raise ValueError(f"Approval allowed_decisions entry {index} is invalid.")
        if decision not in {str(item) for item in allowed}:
            raise ApprovalNotGrantedError(
                "langchain-batch",
                "invalid_decision",
                f"{decision!r} is not allowed for batch action {index}.",
            )


def resume_payload_from_webhook(event: WebhookEvent, *, decision_count: int | None = None) -> dict[str, Any]:
    """Build the payload passed to ``Command(resume=...)`` from a verified event."""

    approval = event.approval
    if approval is None:
        raise ValueError("Webhook event does not contain an approval.")
    count = _decision_count(approval.metadata, decision_count)
    if approval.status == "approved":
        _assert_decision_allowed(approval.metadata, "approve", count)
        decisions = [{"type": "approve"} for _ in range(count)]
    elif approval.status == "rejected":
        _assert_decision_allowed(approval.metadata, "reject", count)
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
