from __future__ import annotations

import hashlib
import json
import math
import re
from collections.abc import Collection, Mapping, Sequence
from itertools import islice
from typing import Any

MAX_COLLECTION_ITEMS = 100
MAX_DEPTH = 8
MAX_STRING_LENGTH = 2_000
REDACTED = "[REDACTED]"
TRUNCATED = "[TRUNCATED]"

DEFAULT_SENSITIVE_KEYS = frozenset(
    {
        "api_key",
        "apikey",
        "authorization",
        "client_secret",
        "cookie",
        "credential",
        "credentials",
        "password",
        "passphrase",
        "private_key",
        "secret",
        "session",
        "session_id",
        "token",
    }
)


def normalized_sensitive_keys(keys: Collection[str] = DEFAULT_SENSITIVE_KEYS) -> frozenset[str]:
    return frozenset(_normalized_key(key) for key in keys)


def safe_json_value(
    value: Any,
    *,
    sensitive_keys: Collection[str] = DEFAULT_SENSITIVE_KEYS,
) -> Any:
    """Return bounded JSON-safe data without invoking arbitrary ``repr`` methods."""

    return _safe_json_value(
        value,
        sensitive_keys=normalized_sensitive_keys(sensitive_keys),
        depth=0,
        seen=set(),
    )


def stable_fingerprint(value: Any) -> str:
    """Return a stable digest of a value without retaining it in the result."""

    encoded = json.dumps(
        _canonical_value(value, depth=0, seen=set()),
        ensure_ascii=True,
        separators=(",", ":"),
        sort_keys=True,
    )
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def stable_operation_key(namespace: str, *parts: Any) -> str:
    """Build a server-safe, deterministic operation key from canonical parts."""

    return f"{namespace}:{stable_fingerprint(parts)}"


def _normalized_key(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", "_", str(value).casefold()).strip("_")


def _json_key(value: Any) -> str:
    if isinstance(value, str):
        return value
    if value is None or isinstance(value, (bool, int, float)):
        return str(value)
    return f"<{type(value).__module__}.{type(value).__qualname__}>"


def _sensitive_key(value: Any, sensitive_keys: frozenset[str]) -> bool:
    key = _normalized_key(value)
    return key in sensitive_keys or any(
        key.endswith(f"_{suffix}")
        for suffix in ("api_key", "password", "private_key", "secret", "token")
    )


def _safe_json_value(
    value: Any,
    *,
    sensitive_keys: frozenset[str],
    depth: int,
    seen: set[int],
) -> Any:
    if value is None or isinstance(value, (bool, int)):
        return value
    if isinstance(value, float):
        return value if math.isfinite(value) else str(value)
    if isinstance(value, str):
        if len(value) <= MAX_STRING_LENGTH:
            return value
        return f"{value[:MAX_STRING_LENGTH]}...{TRUNCATED}"
    if isinstance(value, (bytes, bytearray, memoryview)):
        return f"<{type(value).__name__}:{len(value)} bytes>"
    if depth >= MAX_DEPTH:
        return TRUNCATED

    identity = id(value)
    if identity in seen:
        return "[CIRCULAR]"

    if isinstance(value, Mapping):
        seen.add(identity)
        result: dict[str, Any] = {}
        try:
            for index, (raw_key, item) in enumerate(value.items()):
                if index >= MAX_COLLECTION_ITEMS:
                    result[TRUNCATED] = f"{len(value) - MAX_COLLECTION_ITEMS} more entries"
                    break
                key = _json_key(raw_key)
                result[key] = (
                    REDACTED
                    if _sensitive_key(key, sensitive_keys)
                    else _safe_json_value(
                        item,
                        sensitive_keys=sensitive_keys,
                        depth=depth + 1,
                        seen=seen,
                    )
                )
        finally:
            seen.remove(identity)
        return result

    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        seen.add(identity)
        result: list[Any] = []
        try:
            for index, item in enumerate(value):
                if index >= MAX_COLLECTION_ITEMS:
                    result.append(f"{TRUNCATED}: {len(value) - MAX_COLLECTION_ITEMS} more entries")
                    break
                result.append(
                    _safe_json_value(
                        item,
                        sensitive_keys=sensitive_keys,
                        depth=depth + 1,
                        seen=seen,
                    )
                )
        finally:
            seen.remove(identity)
        return result

    return f"<{type(value).__module__}.{type(value).__qualname__}>"


def _canonical_value(value: Any, *, depth: int, seen: set[int]) -> Any:
    if value is None or isinstance(value, (bool, int, str)):
        return value
    if isinstance(value, float):
        return value if math.isfinite(value) else str(value)
    if isinstance(value, (bytes, bytearray, memoryview)):
        return {"type": type(value).__name__, "sha256": hashlib.sha256(bytes(value)).hexdigest()}
    if depth >= MAX_DEPTH:
        return {"type": type(value).__qualname__, "truncated": True}

    identity = id(value)
    if identity in seen:
        return {"type": type(value).__qualname__, "circular": True}
    if isinstance(value, Mapping):
        seen.add(identity)
        try:
            items = sorted(value.items(), key=lambda pair: _json_key(pair[0]))
            result = {
                _json_key(key): _canonical_value(item, depth=depth + 1, seen=seen)
                for key, item in items[:MAX_COLLECTION_ITEMS]
            }
            if len(items) > MAX_COLLECTION_ITEMS:
                result[TRUNCATED] = len(items) - MAX_COLLECTION_ITEMS
            return result
        finally:
            seen.remove(identity)
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        seen.add(identity)
        try:
            result = [
                _canonical_value(item, depth=depth + 1, seen=seen)
                for item in islice(value, MAX_COLLECTION_ITEMS)
            ]
            if len(value) > MAX_COLLECTION_ITEMS:
                result.append({TRUNCATED: len(value) - MAX_COLLECTION_ITEMS})
            return result
        finally:
            seen.remove(identity)
    return {"type": f"{type(value).__module__}.{type(value).__qualname__}"}
