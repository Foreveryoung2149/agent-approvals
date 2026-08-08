from __future__ import annotations

import asyncio
import json

import httpx
import pytest

from conftest import approval_payload
from nodsend import AsyncNodsend, Nodsend
from nodsend.errors import ApprovalNotGrantedError, AuthenticationError, RateLimitError


def test_create_sends_auth_payload_and_idempotency_key() -> None:
    captured: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        captured.append(request)
        return httpx.Response(201, json=approval_payload())

    with Nodsend(
        "appr_live_secret",
        base_url="https://api.example.test",
        transport=httpx.MockTransport(handler),
    ) as client:
        approval = client.approvals.create(
            action="deploy.production",
            summary="Deploy release 42 to production",
            recipient="reviewer@example.com",
            details={"release": 42},
            webhook_id="wh_test123",
            external_id="release:42",
            metadata={"environment": "production"},
            idempotency_key="deploy-release-42",
        )

    request = captured[0]
    assert approval.id == "apr_test123"
    assert request.url == "https://api.example.test/v1/approvals"
    assert request.headers["Authorization"] == "Bearer appr_live_secret"
    assert request.headers["Idempotency-Key"] == "deploy-release-42"
    assert request.headers["User-Agent"].startswith("nodsend-python/")
    body = json.loads(request.content)
    assert body["webhook_id"] == "wh_test123"
    assert body["external_id"] == "release:42"
    assert "webhook_url" not in body


def test_idempotent_create_retries_with_the_same_key() -> None:
    keys: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        keys.append(request.headers["Idempotency-Key"])
        if len(keys) == 1:
            return httpx.Response(
                503,
                headers={"Retry-After": "0"},
                json={"error": {"code": "temporarily_unavailable", "message": "Try again."}},
            )
        return httpx.Response(201, json=approval_payload())

    with Nodsend(
        "appr_live_secret",
        transport=httpx.MockTransport(handler),
        max_retries=1,
    ) as client:
        client.approvals.create(
            action="deploy.production",
            summary="Deploy release 42",
            recipient="reviewer@example.com",
        )

    assert len(keys) == 2
    assert keys[0] == keys[1]


def test_wait_polls_until_terminal_without_duplicate_writes() -> None:
    statuses = iter(["pending", "approved"])
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json=approval_payload(status=next(statuses)))

    with Nodsend("appr_live_secret", transport=httpx.MockTransport(handler)) as client:
        approval = client.approvals.wait("apr_test123", timeout=1, poll_interval=0.001)

    assert approval.approved
    assert [request.method for request in requests] == ["GET", "GET"]


def test_list_cancel_and_logs_use_the_versioned_resources() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if request.url.path == "/v1/approvals" and request.method == "GET":
            return httpx.Response(
                200,
                json={"approvals": [approval_payload()], "next_cursor": "cursor-2"},
            )
        if request.url.path.endswith("/cancel"):
            return httpx.Response(200, json=approval_payload(status="cancelled"))
        if request.url.path.endswith("/logs"):
            return httpx.Response(
                200,
                json={
                    "approval_id": "apr_test123",
                    "logs": [
                        {
                            "id": "log_test123",
                            "event": "created",
                            "metadata": {"source": "sdk-test"},
                            "created_at": "2026-08-08T18:00:00Z",
                        }
                    ],
                },
            )
        raise AssertionError(f"Unexpected request: {request.method} {request.url}")

    with Nodsend("appr_live_secret", transport=httpx.MockTransport(handler)) as client:
        page = client.approvals.list(status="pending", limit=10, cursor="cursor-1")
        cancelled = client.approvals.cancel("apr_test123", idempotency_key="cancel:apr_test123")
        logs = client.approvals.logs("apr_test123")

    assert page.next_cursor == "cursor-2"
    assert page.approvals[0].id == "apr_test123"
    assert cancelled.status == "cancelled"
    assert logs[0].event == "created"
    assert dict(requests[0].url.params) == {
        "status": "pending",
        "limit": "10",
        "cursor": "cursor-1",
    }
    assert requests[1].headers["Idempotency-Key"] == "cancel:apr_test123"


def test_require_approved_raises_for_rejection() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json=approval_payload(
                status="rejected",
                rejection_reason="Change window is closed.",
            ),
        )

    with Nodsend("appr_live_secret", transport=httpx.MockTransport(handler)) as client:
        with pytest.raises(ApprovalNotGrantedError, match="Change window is closed"):
            client.approvals.require_approved("apr_test123", timeout=0)


@pytest.mark.parametrize(
    ("status_code", "headers", "expected"),
    [
        (401, {}, AuthenticationError),
        (429, {"Retry-After": "12"}, RateLimitError),
    ],
)
def test_api_errors_are_typed(
    status_code: int,
    headers: dict[str, str],
    expected: type[Exception],
) -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(
            status_code,
            headers=headers,
            json={"error": {"code": "test_error", "message": "Request failed."}},
        )

    with Nodsend(
        "appr_live_secret",
        transport=httpx.MockTransport(handler),
        max_retries=0,
    ) as client:
        with pytest.raises(expected) as raised:
            client.approvals.retrieve("apr_test123")
    assert getattr(raised.value, "code") == "test_error"
    if isinstance(raised.value, RateLimitError):
        assert raised.value.retry_after == 12


def test_rate_limit_understands_http_date_retry_after() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(
            429,
            headers={
                "Date": "Sat, 08 Aug 2026 18:00:00 GMT",
                "Retry-After": "Sat, 08 Aug 2026 18:00:07 GMT",
            },
            json={"error": {"code": "rate_limited", "message": "Slow down."}},
        )

    with Nodsend(
        "appr_live_secret",
        transport=httpx.MockTransport(handler),
        max_retries=0,
    ) as client:
        with pytest.raises(RateLimitError) as raised:
            client.approvals.retrieve("apr_test123")
    assert raised.value.retry_after == 7


def test_async_client_uses_the_same_contract() -> None:
    requests: list[httpx.Request] = []

    async def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(201, json=approval_payload(status="approved"))

    async def scenario() -> None:
        async with AsyncNodsend(
            "appr_live_secret",
            base_url="https://api.example.test",
            transport=httpx.MockTransport(handler),
        ) as client:
            approval = await client.approvals.create(
                action="deploy.production",
                summary="Deploy release 42",
                recipient="reviewer@example.com",
                idempotency_key="release-42",
            )
        assert approval.approved

    asyncio.run(scenario())
    assert requests[0].headers["Idempotency-Key"] == "release-42"
