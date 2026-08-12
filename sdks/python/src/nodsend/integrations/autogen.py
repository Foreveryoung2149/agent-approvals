from __future__ import annotations

import functools
import inspect
from collections.abc import Awaitable, Callable, Collection, Mapping
from typing import Any, TypeVar

from .._client import AsyncNodsend
from ..errors import OptionalDependencyError
from ._serialization import DEFAULT_SENSITIVE_KEYS, safe_json_value, stable_operation_key

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
    sensitive_keys: Collection[str] = DEFAULT_SENSITIVE_KEYS,
) -> Callable[..., Awaitable[T]]:
    """Wrap a consequential callable so its body cannot run before approval.

    The wrapper intentionally gates the side effect itself. A standalone
    model-callable ``request_approval`` tool is not a security boundary because
    a model can omit it. Arguments are bounded and credential-like keys are
    redacted before leaving the process.

    By default, the callable identity and canonical redacted arguments produce
    a stable operation key, so a retry of the same logical invocation reuses
    its approval. Two intentional invocations with identical arguments cannot
    be distinguished without additional application context; provide
    ``idempotency_key`` (for example, using a durable run or tool-call ID) when
    identical calls must create separate approvals.
    """

    signature = inspect.signature(function)

    @functools.wraps(function)
    async def guarded(*args: Any, **kwargs: Any) -> T:
        bound = signature.bind(*args, **kwargs)
        bound.apply_defaults()
        arguments = dict(bound.arguments)
        safe_arguments = safe_json_value(arguments, sensitive_keys=sensitive_keys)
        approval_summary = summary(safe_arguments) if callable(summary) else summary
        operation_key = (
            idempotency_key(arguments)
            if idempotency_key
            else stable_operation_key(
                "autogen",
                function.__module__,
                function.__qualname__,
                safe_arguments,
            )
        )
        approval = await client.approvals.create(
            action=action or function.__name__,
            summary=approval_summary,
            recipient=recipient,
            details={"arguments": safe_arguments},
            webhook_id=webhook_id,
            expires_in=expires_in,
            agent_name="AutoGen",
            external_id=operation_key,
            metadata={"integration": "autogen", "function": function.__name__},
            idempotency_key=operation_key,
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
    sensitive_keys: Collection[str] = DEFAULT_SENSITIVE_KEYS,
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
        sensitive_keys=sensitive_keys,
    )
    return FunctionTool(guarded, description=description, name=action or function.__name__)
