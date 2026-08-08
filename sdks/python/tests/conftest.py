from __future__ import annotations

from typing import Any


def approval_payload(
    *,
    approval_id: str = "apr_test123",
    status: str = "pending",
    **overrides: Any,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "id": approval_id,
        "status": status,
        "action": "deploy.production",
        "summary": "Deploy release 42 to production",
        "details": {"release": 42},
        "channel": "email",
        "recipient": "reviewer@example.com",
        "agent_name": "release-agent",
        "external_id": "release:42",
        "metadata": {"environment": "production"},
        "decided_by": None,
        "rejection_reason": None,
        "expires_at": "2026-08-08T19:00:00Z",
        "decided_at": None,
        "created_at": "2026-08-08T18:00:00Z",
        "updated_at": "2026-08-08T18:00:00Z",
    }
    payload.update(overrides)
    return payload
