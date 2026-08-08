from __future__ import annotations

import hashlib
import hmac
import json
import time
from collections.abc import Callable, Mapping
from typing import Any

from .errors import WebhookVerificationError
from .models import WebhookEvent


def _headers(headers: Mapping[str, str]) -> dict[str, str]:
    return {key.lower(): value for key, value in headers.items()}


def _signature(value: str) -> str | None:
    for part in value.split(","):
        key, separator, candidate = part.strip().partition("=")
        if separator and key == "v1" and candidate:
            return candidate
    return None


def verify_webhook(
    payload: bytes | str,
    headers: Mapping[str, str],
    secret: str,
    *,
    tolerance: int = 300,
    now: int | None = None,
    replay_guard: Callable[[str], bool] | None = None,
) -> WebhookEvent:
    """Verify a Nodsend webhook against the exact raw HTTP body.

    ``replay_guard`` should atomically return ``True`` the first time an event ID
    is observed and ``False`` for duplicates. In production, back it with a
    durable unique key rather than process memory.
    """

    if not secret:
        raise WebhookVerificationError("A webhook signing secret is required.")
    raw = payload.encode("utf-8") if isinstance(payload, str) else payload
    normalized = _headers(headers)

    event_id = normalized.get("nodsend-webhook-id")
    timestamp_text = normalized.get("nodsend-webhook-timestamp")
    signature_text = normalized.get("nodsend-webhook-signature")
    legacy = False
    if not timestamp_text or not signature_text:
        timestamp_text = normalized.get("approval-timestamp")
        signature_text = normalized.get("approval-signature")
        legacy = bool(timestamp_text and signature_text)

    if not timestamp_text or not signature_text:
        raise WebhookVerificationError("Missing Nodsend webhook signature headers.")
    try:
        timestamp = int(timestamp_text)
    except ValueError as exc:
        raise WebhookVerificationError("Webhook timestamp is invalid.") from exc

    current_time = int(time.time()) if now is None else now
    if tolerance >= 0 and abs(current_time - timestamp) > tolerance:
        raise WebhookVerificationError("Webhook timestamp is outside the allowed tolerance.")

    supplied = _signature(signature_text)
    if not supplied:
        raise WebhookVerificationError("Webhook signature does not contain a v1 value.")

    if legacy:
        signed = str(timestamp).encode("ascii") + b"." + raw
    else:
        if not event_id:
            raise WebhookVerificationError("Missing Nodsend-Webhook-Id header.")
        signed = event_id.encode("utf-8") + b"." + str(timestamp).encode("ascii") + b"." + raw
    expected = hmac.new(secret.encode("utf-8"), signed, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(supplied, expected):
        raise WebhookVerificationError("Webhook signature is invalid.")

    try:
        decoded: Any = json.loads(raw)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise WebhookVerificationError("Webhook body is not valid UTF-8 JSON.") from exc
    if not isinstance(decoded, Mapping):
        raise WebhookVerificationError("Webhook body must be a JSON object.")

    payload_event_id = decoded.get("event_id")
    if event_id and payload_event_id != event_id:
        raise WebhookVerificationError("Webhook event ID does not match its signed header.")
    effective_event_id = str(payload_event_id or event_id or "")
    if not effective_event_id:
        raise WebhookVerificationError("Webhook body is missing event_id.")
    if replay_guard is not None and not replay_guard(effective_event_id):
        raise WebhookVerificationError("Webhook event has already been processed.")

    try:
        return WebhookEvent.from_dict(decoded)
    except (KeyError, TypeError, ValueError) as exc:
        raise WebhookVerificationError("Webhook body does not match the Nodsend event schema.") from exc


class WebhookVerifier:
    def __init__(
        self,
        secret: str,
        *,
        tolerance: int = 300,
        replay_guard: Callable[[str], bool] | None = None,
    ) -> None:
        self.secret = secret
        self.tolerance = tolerance
        self.replay_guard = replay_guard

    def verify(self, payload: bytes | str, headers: Mapping[str, str], *, now: int | None = None) -> WebhookEvent:
        return verify_webhook(
            payload,
            headers,
            self.secret,
            tolerance=self.tolerance,
            now=now,
            replay_guard=self.replay_guard,
        )
