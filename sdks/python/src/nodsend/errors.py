from __future__ import annotations

from typing import Any


class NodsendError(Exception):
    """Base class for all SDK errors."""


class ConfigurationError(NodsendError):
    """The SDK is missing required local configuration."""


class OptionalDependencyError(NodsendError, ImportError):
    """An optional framework adapter was imported without its dependency."""


class APIError(NodsendError):
    def __init__(
        self,
        message: str,
        *,
        status_code: int,
        code: str = "api_error",
        request_id: str | None = None,
        retryable: bool = False,
        body: Any = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.request_id = request_id
        self.retryable = retryable
        self.body = body

    def __str__(self) -> str:
        request = f" request_id={self.request_id}" if self.request_id else ""
        return f"{self.message} (status={self.status_code}, code={self.code}{request})"


class AuthenticationError(APIError):
    pass


class PermissionDeniedError(APIError):
    pass


class NotFoundError(APIError):
    pass


class ConflictError(APIError):
    pass


class ValidationError(APIError):
    pass


class RateLimitError(APIError):
    def __init__(self, *args: Any, retry_after: float | None = None, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self.retry_after = retry_after


class ApprovalTimeoutError(NodsendError):
    def __init__(self, approval_id: str, timeout: float) -> None:
        super().__init__(f"Approval {approval_id} did not reach a terminal state within {timeout:g}s.")
        self.approval_id = approval_id
        self.timeout = timeout


class ApprovalNotGrantedError(NodsendError):
    def __init__(self, approval_id: str, status: str, reason: str | None = None) -> None:
        suffix = f": {reason}" if reason else ""
        super().__init__(f"Approval {approval_id} ended with status '{status}'{suffix}")
        self.approval_id = approval_id
        self.status = status
        self.reason = reason


class WebhookVerificationError(NodsendError):
    pass
