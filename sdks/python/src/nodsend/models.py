from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Literal, Mapping

ApprovalStatus = Literal["pending", "approved", "rejected", "expired", "cancelled"]
ApprovalChannel = Literal["email"]
TERMINAL_STATUSES: frozenset[str] = frozenset({"approved", "rejected", "expired", "cancelled"})


def _datetime(value: Any) -> datetime | None:
    if value is None or isinstance(value, datetime):
        return value
    if isinstance(value, str):
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    raise TypeError(f"Expected an ISO-8601 timestamp, received {type(value).__name__}")


@dataclass(frozen=True, slots=True)
class Approval:
    id: str
    status: ApprovalStatus
    action: str | None = None
    summary: str | None = None
    details: Mapping[str, Any] = field(default_factory=dict)
    channel: ApprovalChannel | None = None
    recipient: str | None = None
    agent_name: str | None = None
    external_id: str | None = None
    metadata: Mapping[str, Any] = field(default_factory=dict)
    decided_by: str | None = None
    rejection_reason: str | None = None
    expires_at: datetime | None = None
    decided_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @property
    def terminal(self) -> bool:
        return self.status in TERMINAL_STATUSES

    @property
    def approved(self) -> bool:
        return self.status == "approved"

    @classmethod
    def from_dict(cls, data: Mapping[str, Any]) -> "Approval":
        return cls(
            id=str(data["id"]),
            status=str(data["status"]).lower(),  # type: ignore[arg-type]
            action=data.get("action"),
            summary=data.get("summary"),
            details=data.get("details") or {},
            channel=str(data["channel"]).lower() if data.get("channel") else None,  # type: ignore[arg-type]
            recipient=data.get("recipient"),
            agent_name=data.get("agent_name"),
            external_id=data.get("external_id"),
            metadata=data.get("metadata") or {},
            decided_by=data.get("decided_by"),
            rejection_reason=data.get("rejection_reason"),
            expires_at=_datetime(data.get("expires_at")),
            decided_at=_datetime(data.get("decided_at")),
            created_at=_datetime(data.get("created_at")),
            updated_at=_datetime(data.get("updated_at")),
        )


@dataclass(frozen=True, slots=True)
class ApprovalPage:
    approvals: tuple[Approval, ...]
    next_cursor: str | None = None

    @classmethod
    def from_dict(cls, data: Mapping[str, Any]) -> "ApprovalPage":
        return cls(
            approvals=tuple(Approval.from_dict(item) for item in data.get("approvals", [])),
            next_cursor=data.get("next_cursor"),
        )


@dataclass(frozen=True, slots=True)
class ApprovalLog:
    id: str
    event: str
    metadata: Mapping[str, Any] = field(default_factory=dict)
    created_at: datetime | None = None

    @classmethod
    def from_dict(cls, data: Mapping[str, Any]) -> "ApprovalLog":
        return cls(
            id=str(data["id"]),
            event=str(data["event"]),
            metadata=data.get("metadata") or {},
            created_at=_datetime(data.get("created_at")),
        )


@dataclass(frozen=True, slots=True)
class WebhookEvent:
    event_id: str
    event_type: str
    created_at: datetime
    approval: Approval | None
    data: Mapping[str, Any]
    raw: Mapping[str, Any]

    @classmethod
    def from_dict(cls, payload: Mapping[str, Any]) -> "WebhookEvent":
        data = payload.get("data") if isinstance(payload.get("data"), Mapping) else {}
        approval_data = data.get("approval") if isinstance(data, Mapping) else None
        if not isinstance(approval_data, Mapping) and isinstance(payload.get("approval"), Mapping):
            # Compatibility with pre-1.0 webhook payloads.
            approval_data = payload.get("approval")
            data = {"approval": approval_data}
        return cls(
            event_id=str(payload["event_id"]),
            event_type=str(payload["event_type"]),
            created_at=_datetime(payload["created_at"]) or datetime.min,
            approval=Approval.from_dict(approval_data) if isinstance(approval_data, Mapping) else None,
            data=data,
            raw=payload,
        )
