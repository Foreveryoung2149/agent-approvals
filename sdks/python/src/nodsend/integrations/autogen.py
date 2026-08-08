from __future__ import annotations

import functools
import inspect
from collections.abc import Awaitable, Callable, Mapping
from typing import Any, TypeVar

from .._client import AsyncNodsend
from ..errors import OptionalDependencyError

T = TypeVar("T")

try:  # Optional by design; the core client does not depend on AutoGen.
    from autogen_core.tools import FunctionTool
except ImportError:  # pragma: no cover - exercised in an environment without AutoGen
    FunctionTool = None  # type: ignore[assignment,misc]


def guard_callable(
    function: Callable[..., T | Awaitable[T]],
    *,
    client: AsyncNodsend,
    recipient: str,
    summary: str | Callable[[Mapping[str, Any]], str],
    action: str | None = None,
    webhook_id: str | None = None,
    expires_in: str = "1h",
    timeout: float = 3600,
    idempotency_key: Callable[[Mapping[str, Any]], str] | None = None,
) -> Callable[..., Awaitable[T]]:
    """Wrap a consequential callable so its body cannot run before approval.

    The wrapper intentionally gates the side effect itself. A standalone
    model-callable ``request_approval`` tool is not a security boundary because
    a model can omit it.
    """

    signature = inspect.signature(function)

    @functools.wraps(function)
    async def guarded(*args: Any, **kwargs: Any) -> T:
        bound = signature.bind(*args, **kwargs)
        bound.apply_defaults()
        arguments = dict(bound.arguments)
        approval_summary = summary(arguments) if callable(summary) else summary
        approval = await client.approvals.create(
            action=action or function.__name__,
            summary=approval_summary,
            recipient=recipient,
            details={"arguments": arguments},
            webhook_id=webhook_id,
            expires_in=expires_in,
            agent_name="AutoGen",
            external_id=None,
            metadata={"integration": "autogen", "function": function.__name__},
            idempotency_key=idempotency_key(arguments) if idempotency_key else None,
        )
        await client.approvals.require_approved(approval.id, timeout=timeout)
        result = function(*args, **kwargs)
        if inspect.isawaitable(result):
            return await result
        return result

    return guarded


def function_tool(
    function: Callable[..., T | Awaitable[T]],
    *,
    client: AsyncNodsend,
    recipient: str,
    summary: str | Callable[[Mapping[str, Any]], str],
    description: str,
    action: str | None = None,
    webhook_id: str | None = None,
    expires_in: str = "1h",
    timeout: float = 3600,
    idempotency_key: Callable[[Mapping[str, Any]], str] | None = None,
) -> Any:
    """Create AutoGen's native ``FunctionTool`` around a guarded callable."""

    if FunctionTool is None:
        raise OptionalDependencyError(
            "Install the AutoGen adapter with `pip install 'nodsend-ai[autogen]'`."
        )
    guarded = guard_callable(
        function,
        client=client,
        recipient=recipient,
        summary=summary,
        action=action,
        webhook_id=webhook_id,
        expires_in=expires_in,
        timeout=timeout,
        idempotency_key=idempotency_key,
    )
    return FunctionTool(guarded, description=description, name=action or function.__name__)
