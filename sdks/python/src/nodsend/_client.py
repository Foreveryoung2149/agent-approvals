from __future__ import annotations

import asyncio
import os
import random
import time
import uuid
from collections.abc import Mapping
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any

import httpx

from ._version import __version__
from .errors import (
    APIError,
    ApprovalNotGrantedError,
    ApprovalTimeoutError,
    AuthenticationError,
    ConfigurationError,
    ConflictError,
    NodsendError,
    NotFoundError,
    PermissionDeniedError,
    RateLimitError,
    ValidationError,
)
from .models import Approval, ApprovalChannel, ApprovalLog, ApprovalPage, ApprovalStatus

DEFAULT_BASE_URL = "https://api.nodsend.com"
RETRYABLE_STATUS_CODES = frozenset({408, 429, 500, 502, 503, 504})
SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})


def _request_id(response: httpx.Response) -> str | None:
    return response.headers.get("Nodsend-Request-Id") or response.headers.get("X-Request-Id")


def _retry_after(response: httpx.Response) -> float | None:
    value = response.headers.get("Retry-After")
    if not value:
        return None
    try:
        return max(0.0, float(value))
    except ValueError:
        try:
            retry_at = parsedate_to_datetime(value)
            if retry_at.tzinfo is None:
                retry_at = retry_at.replace(tzinfo=timezone.utc)
            date_header = response.headers.get("Date")
            server_now = parsedate_to_datetime(date_header) if date_header else datetime.now(timezone.utc)
            if server_now.tzinfo is None:
                server_now = server_now.replace(tzinfo=timezone.utc)
            return max(0.0, (retry_at - server_now).total_seconds())
        except (TypeError, ValueError, OverflowError):
            return None


def _error_from_response(response: httpx.Response) -> APIError:
    try:
        body: Any = response.json()
    except ValueError:
        body = {"error": {"message": response.text or "Nodsend API request failed."}}
    error = body.get("error", {}) if isinstance(body, Mapping) else {}
    message = str(error.get("message") or f"Nodsend API request failed with HTTP {response.status_code}.")
    code = str(error.get("code") or "api_error")
    common = {
        "status_code": response.status_code,
        "code": code,
        "request_id": _request_id(response),
        "retryable": response.status_code in RETRYABLE_STATUS_CODES,
        "body": body,
    }
    if response.status_code == 401:
        return AuthenticationError(message, **common)
    if response.status_code == 403:
        return PermissionDeniedError(message, **common)
    if response.status_code == 404:
        return NotFoundError(message, **common)
    if response.status_code == 409:
        return ConflictError(message, **common)
    if response.status_code in {400, 422}:
        return ValidationError(message, **common)
    if response.status_code == 429:
        return RateLimitError(message, retry_after=_retry_after(response), **common)
    return APIError(message, **common)


def _delay(attempt: int, response: httpx.Response | None = None) -> float:
    if response is not None:
        retry_after = _retry_after(response)
        if retry_after is not None:
            return min(retry_after, 30.0)
    return min(0.5 * (2**attempt) + random.uniform(0, 0.25), 8.0)


def _payload(**values: Any) -> dict[str, Any]:
    return {key: value for key, value in values.items() if value is not None}


class _SyncApprovals:
    def __init__(self, client: "Nodsend") -> None:
        self._client = client

    def create(
        self,
        *,
        action: str,
        summary: str,
        recipient: str,
        details: Mapping[str, Any] | None = None,
        channel: ApprovalChannel = "email",
        expires_in: str = "1h",
        webhook_id: str | None = None,
        agent_name: str | None = None,
        external_id: str | None = None,
        metadata: Mapping[str, Any] | None = None,
        idempotency_key: str | None = None,
    ) -> Approval:
        key = idempotency_key or str(uuid.uuid4())
        data = self._client._request(
            "POST",
            "/v1/approvals",
            json=_payload(
                action=action,
                summary=summary,
                recipient=recipient,
                details=dict(details or {}),
                channel=channel,
                expires_in=expires_in,
                webhook_id=webhook_id,
                agent_name=agent_name,
                external_id=external_id,
                metadata=dict(metadata or {}),
            ),
            idempotency_key=key,
        )
        return Approval.from_dict(data)

    def retrieve(self, approval_id: str) -> Approval:
        return Approval.from_dict(self._client._request("GET", f"/v1/approvals/{approval_id}"))

    def list(
        self,
        *,
        status: ApprovalStatus | None = None,
        limit: int = 50,
        cursor: str | None = None,
    ) -> ApprovalPage:
        data = self._client._request(
            "GET",
            "/v1/approvals",
            params=_payload(status=status, limit=limit, cursor=cursor),
        )
        return ApprovalPage.from_dict(data)

    def cancel(self, approval_id: str, *, idempotency_key: str | None = None) -> Approval:
        data = self._client._request(
            "POST",
            f"/v1/approvals/{approval_id}/cancel",
            json={},
            idempotency_key=idempotency_key or str(uuid.uuid4()),
        )
        return Approval.from_dict(data)

    def logs(self, approval_id: str) -> tuple[ApprovalLog, ...]:
        data = self._client._request("GET", f"/v1/approvals/{approval_id}/logs")
        return tuple(ApprovalLog.from_dict(item) for item in data.get("logs", []))

    def wait(
        self,
        approval_id: str,
        *,
        timeout: float = 3600,
        poll_interval: float = 2.0,
    ) -> Approval:
        if timeout < 0 or poll_interval <= 0:
            raise ValueError("timeout must be non-negative and poll_interval must be positive")
        started = time.monotonic()
        while True:
            approval = self.retrieve(approval_id)
            if approval.terminal:
                return approval
            elapsed = time.monotonic() - started
            if elapsed >= timeout:
                raise ApprovalTimeoutError(approval_id, timeout)
            time.sleep(min(poll_interval, timeout - elapsed))

    def require_approved(self, approval_id: str, **wait_options: Any) -> Approval:
        approval = self.wait(approval_id, **wait_options)
        if not approval.approved:
            raise ApprovalNotGrantedError(approval.id, approval.status, approval.rejection_reason)
        return approval


class _AsyncApprovals:
    def __init__(self, client: "AsyncNodsend") -> None:
        self._client = client

    async def create(
        self,
        *,
        action: str,
        summary: str,
        recipient: str,
        details: Mapping[str, Any] | None = None,
        channel: ApprovalChannel = "email",
        expires_in: str = "1h",
        webhook_id: str | None = None,
        agent_name: str | None = None,
        external_id: str | None = None,
        metadata: Mapping[str, Any] | None = None,
        idempotency_key: str | None = None,
    ) -> Approval:
        key = idempotency_key or str(uuid.uuid4())
        data = await self._client._request(
            "POST",
            "/v1/approvals",
            json=_payload(
                action=action,
                summary=summary,
                recipient=recipient,
                details=dict(details or {}),
                channel=channel,
                expires_in=expires_in,
                webhook_id=webhook_id,
                agent_name=agent_name,
                external_id=external_id,
                metadata=dict(metadata or {}),
            ),
            idempotency_key=key,
        )
        return Approval.from_dict(data)

    async def retrieve(self, approval_id: str) -> Approval:
        return Approval.from_dict(await self._client._request("GET", f"/v1/approvals/{approval_id}"))

    async def list(
        self,
        *,
        status: ApprovalStatus | None = None,
        limit: int = 50,
        cursor: str | None = None,
    ) -> ApprovalPage:
        data = await self._client._request(
            "GET",
            "/v1/approvals",
            params=_payload(status=status, limit=limit, cursor=cursor),
        )
        return ApprovalPage.from_dict(data)

    async def cancel(self, approval_id: str, *, idempotency_key: str | None = None) -> Approval:
        data = await self._client._request(
            "POST",
            f"/v1/approvals/{approval_id}/cancel",
            json={},
            idempotency_key=idempotency_key or str(uuid.uuid4()),
        )
        return Approval.from_dict(data)

    async def logs(self, approval_id: str) -> tuple[ApprovalLog, ...]:
        data = await self._client._request("GET", f"/v1/approvals/{approval_id}/logs")
        return tuple(ApprovalLog.from_dict(item) for item in data.get("logs", []))

    async def wait(
        self,
        approval_id: str,
        *,
        timeout: float = 3600,
        poll_interval: float = 2.0,
    ) -> Approval:
        if timeout < 0 or poll_interval <= 0:
            raise ValueError("timeout must be non-negative and poll_interval must be positive")
        loop = asyncio.get_running_loop()
        started = loop.time()
        while True:
            approval = await self.retrieve(approval_id)
            if approval.terminal:
                return approval
            elapsed = loop.time() - started
            if elapsed >= timeout:
                raise ApprovalTimeoutError(approval_id, timeout)
            await asyncio.sleep(min(poll_interval, timeout - elapsed))

    async def require_approved(self, approval_id: str, **wait_options: Any) -> Approval:
        approval = await self.wait(approval_id, **wait_options)
        if not approval.approved:
            raise ApprovalNotGrantedError(approval.id, approval.status, approval.rejection_reason)
        return approval


class Nodsend:
    def __init__(
        self,
        api_key: str | None = None,
        *,
        base_url: str | None = None,
        timeout: float | httpx.Timeout = 10.0,
        max_retries: int = 2,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        key = api_key or os.getenv("NODSEND_API_KEY")
        if not key:
            raise ConfigurationError("Set NODSEND_API_KEY or pass api_key to Nodsend().")
        if max_retries < 0:
            raise ValueError("max_retries must be non-negative")
        self.max_retries = max_retries
        self._http = httpx.Client(
            base_url=(base_url or os.getenv("NODSEND_BASE_URL") or DEFAULT_BASE_URL).rstrip("/"),
            timeout=timeout,
            transport=transport,
            headers={
                "Authorization": f"Bearer {key}",
                "Accept": "application/json",
                "User-Agent": f"nodsend-python/{__version__}",
            },
        )
        self.approvals = _SyncApprovals(self)

    def _request(
        self,
        method: str,
        path: str,
        *,
        json: Any = None,
        params: Mapping[str, Any] | None = None,
        idempotency_key: str | None = None,
    ) -> Any:
        method = method.upper()
        retryable_request = method in SAFE_METHODS or bool(idempotency_key)
        headers = {"Idempotency-Key": idempotency_key} if idempotency_key else None
        for attempt in range(self.max_retries + 1):
            try:
                response = self._http.request(method, path, json=json, params=params, headers=headers)
            except httpx.TransportError as exc:
                if not retryable_request or attempt >= self.max_retries:
                    raise NodsendError(f"Network request to Nodsend failed: {exc}") from exc
                time.sleep(_delay(attempt))
                continue
            if response.status_code in RETRYABLE_STATUS_CODES and retryable_request and attempt < self.max_retries:
                time.sleep(_delay(attempt, response))
                continue
            if response.is_error:
                raise _error_from_response(response)
            if response.status_code == 204 or not response.content:
                return {}
            try:
                return response.json()
            except ValueError as exc:
                raise NodsendError("Nodsend returned an invalid JSON response.") from exc
        raise AssertionError("request retry loop exited unexpectedly")

    def close(self) -> None:
        self._http.close()

    def __enter__(self) -> "Nodsend":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()


class AsyncNodsend:
    def __init__(
        self,
        api_key: str | None = None,
        *,
        base_url: str | None = None,
        timeout: float | httpx.Timeout = 10.0,
        max_retries: int = 2,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        key = api_key or os.getenv("NODSEND_API_KEY")
        if not key:
            raise ConfigurationError("Set NODSEND_API_KEY or pass api_key to AsyncNodsend().")
        if max_retries < 0:
            raise ValueError("max_retries must be non-negative")
        self.max_retries = max_retries
        self._http = httpx.AsyncClient(
            base_url=(base_url or os.getenv("NODSEND_BASE_URL") or DEFAULT_BASE_URL).rstrip("/"),
            timeout=timeout,
            transport=transport,
            headers={
                "Authorization": f"Bearer {key}",
                "Accept": "application/json",
                "User-Agent": f"nodsend-python/{__version__}",
            },
        )
        self.approvals = _AsyncApprovals(self)

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json: Any = None,
        params: Mapping[str, Any] | None = None,
        idempotency_key: str | None = None,
    ) -> Any:
        method = method.upper()
        retryable_request = method in SAFE_METHODS or bool(idempotency_key)
        headers = {"Idempotency-Key": idempotency_key} if idempotency_key else None
        for attempt in range(self.max_retries + 1):
            try:
                response = await self._http.request(method, path, json=json, params=params, headers=headers)
            except httpx.TransportError as exc:
                if not retryable_request or attempt >= self.max_retries:
                    raise NodsendError(f"Network request to Nodsend failed: {exc}") from exc
                await asyncio.sleep(_delay(attempt))
                continue
            if response.status_code in RETRYABLE_STATUS_CODES and retryable_request and attempt < self.max_retries:
                await asyncio.sleep(_delay(attempt, response))
                continue
            if response.is_error:
                raise _error_from_response(response)
            if response.status_code == 204 or not response.content:
                return {}
            try:
                return response.json()
            except ValueError as exc:
                raise NodsendError("Nodsend returned an invalid JSON response.") from exc
        raise AssertionError("request retry loop exited unexpectedly")

    async def close(self) -> None:
        await self._http.aclose()

    async def __aenter__(self) -> "AsyncNodsend":
        return self

    async def __aexit__(self, *_: object) -> None:
        await self.close()
