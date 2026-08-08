from __future__ import annotations

import hashlib
import hmac
import json

import pytest

from conftest import approval_payload
from nodsend.errors import WebhookVerificationError
from nodsend.webhooks import verify_webhook


SECRET = "whsec_test_secret"
EVENT_ID = "evt_test123"
NOW = 1_786_204_800


def _body() -> bytes:
    return json.dumps(
        {
            "event_id": EVENT_ID,
            "event_type": "approval.approved",
            "created_at": "2026-08-08T18:00:00Z",
            "data": {"approval": approval_payload(status="approved")},
        },
        separators=(",", ":"),
    ).encode()


def _headers(body: bytes, *, timestamp: int = NOW) -> dict[str, str]:
    signed = f"{EVENT_ID}.{timestamp}.".encode() + body
    digest = hmac.new(SECRET.encode(), signed, hashlib.sha256).hexdigest()
    return {
        "Nodsend-Webhook-Id": EVENT_ID,
        "Nodsend-Webhook-Timestamp": str(timestamp),
        "Nodsend-Webhook-Signature": f"v1={digest}",
    }


def test_verifies_exact_raw_body_and_returns_typed_event() -> None:
    body = _body()
    event = verify_webhook(body, _headers(body), SECRET, now=NOW)
    assert event.event_id == EVENT_ID
    assert event.approval is not None
    assert event.approval.approved


def test_rejects_tampering_stale_messages_and_replays() -> None:
    body = _body()
    headers = _headers(body)
    with pytest.raises(WebhookVerificationError, match="invalid"):
        verify_webhook(body + b" ", headers, SECRET, now=NOW)

    with pytest.raises(WebhookVerificationError, match="tolerance"):
        verify_webhook(body, headers, SECRET, now=NOW + 301)

    seen: set[str] = set()

    def remember(event_id: str) -> bool:
        if event_id in seen:
            return False
        seen.add(event_id)
        return True

    verify_webhook(body, headers, SECRET, now=NOW, replay_guard=remember)
    with pytest.raises(WebhookVerificationError, match="already been processed"):
        verify_webhook(body, headers, SECRET, now=NOW, replay_guard=remember)


def test_legacy_headers_are_migration_only_but_verifiable() -> None:
    body = _body()
    signed = f"{NOW}.".encode() + body
    digest = hmac.new(SECRET.encode(), signed, hashlib.sha256).hexdigest()
    event = verify_webhook(
        body,
        {
            "Approval-Timestamp": str(NOW),
            "Approval-Signature": f"v1={digest}",
        },
        SECRET,
        now=NOW,
    )
    assert event.event_id == EVENT_ID
