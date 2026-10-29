"""Security utilities for the InfinAssistant integration.

Provides:
- WebhookAuthenticator  — HMAC-SHA256 signature verification with replay protection
                          and dual-key grace-period support for key rotation
- TokenBucketRateLimiter — per-device-id token bucket rate limiter
"""
from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import logging
import re
import time
from typing import NamedTuple


# Strict urlsafe-base64 alphabet: A-Z a-z 0-9 - _ with optional padding.
# base64.urlsafe_b64decode silently drops out-of-alphabet bytes by default, so
# we anchor a regex up-front to catch corrupt secrets that the lenient
# decoder would otherwise accept as an empty/short byte string.
_URLSAFE_B64_RE = re.compile(r"^[A-Za-z0-9_\-]+={0,2}$")


class InvalidHmacSecretError(ValueError):
    """Raised when a stored HMAC secret cannot be decoded.

    The caller is expected to translate this into a HA-level
    ``ConfigEntryNotReady`` (so HA retries setup) and prompt the user to
    re-rotate the key. Carries a short, user-facing detail string.
    """


def _decode_urlsafe_b64_strict(value: str, *, label: str) -> bytes:
    """Decode urlsafe-base64 strictly, rejecting any out-of-alphabet input.

    Raises ``InvalidHmacSecretError`` on a malformed input. ``label`` is used
    in the error message ("current"/"rotated old") so the user can tell which
    secret is broken when both are stored.
    """
    if not isinstance(value, str) or not value:
        raise InvalidHmacSecretError(f"{label} HMAC secret is empty or non-string")
    if not _URLSAFE_B64_RE.match(value):
        raise InvalidHmacSecretError(
            f"{label} HMAC secret contains characters outside the urlsafe-base64 alphabet"
        )
    try:
        return base64.urlsafe_b64decode(value)
    except (binascii.Error, ValueError, TypeError) as err:
        raise InvalidHmacSecretError(
            f"{label} HMAC secret is not valid base64: {err}"
        ) from err

from .const import (
    DEFAULT_REPLAY_WINDOW,
    DEFAULT_RATE_LIMIT,
    RATE_LIMIT_BURST,
    HMAC_GRACE_PERIOD,
)

_LOGGER = logging.getLogger(__name__)

# Request headers the bridge app must send
HEADER_DEVICE_ID = "X-InfinAssistant-Device-Id"
HEADER_TIMESTAMP = "X-InfinAssistant-Timestamp"
HEADER_SIGNATURE = "X-InfinAssistant-Signature"


class HmacResult(NamedTuple):
    """Result of an HMAC verification attempt."""

    valid: bool
    error: str | None  # human-readable reason on failure, None on success
    used_old_key: bool  # True when old (rotated) key was accepted


class WebhookAuthenticator:
    """Verifies HMAC-SHA256 signatures on incoming webhook requests.

    Supports a two-key rotation window: once ``rotate_key`` is called the old
    secret is kept alongside the new one and accepted for ``HMAC_GRACE_PERIOD``
    seconds.  After the grace period only the new key is valid.
    """

    def __init__(
        self,
        secret_b64: str,
        old_secret_b64: str | None = None,
        rotation_time: float | None = None,
        replay_window: int = DEFAULT_REPLAY_WINDOW,
    ) -> None:
        """Initialise the authenticator.

        Args:
            secret_b64:     Base64-encoded current HMAC secret.
            old_secret_b64: Base64-encoded previous secret (present after rotation).
            rotation_time:  Unix timestamp when rotation was triggered.
            replay_window:  Max allowed age of a request timestamp in seconds.

        Raises:
            InvalidHmacSecretError: when secret_b64 (or old_secret_b64) is not a
                valid urlsafe-base64 string. REQ-050: a corrupt config entry
                must surface as a typed error so the caller can fail closed and
                prompt the user to re-rotate, rather than blowing up integration
                setup with an opaque binascii.Error or, worse, silently
                accepting a near-empty key after the base64 decoder swallows
                out-of-alphabet characters.
        """
        self._secret: bytes = _decode_urlsafe_b64_strict(secret_b64, label="current")
        self._old_secret: bytes | None = (
            _decode_urlsafe_b64_strict(old_secret_b64, label="rotated old")
            if old_secret_b64
            else None
        )
        self._rotation_time: float | None = rotation_time
        self._replay_window = replay_window

    # ------------------------------------------------------------------ public

    def verify(
        self,
        device_id: str,
        timestamp_str: str,
        raw_body: bytes,
        signature_hex: str,
    ) -> HmacResult:
        """Verify a webhook request signature.

        Returns an ``HmacResult`` indicating whether the request is authentic.
        Callers should treat ``valid=False`` as HTTP 401.

        The canonical payload is:
            ``<device_id_bytes> + b':' + <timestamp_bytes> + b':' + <raw_body>``

        Args:
            device_id:     Value of the ``X-InfinAssistant-Device-Id`` header.
            timestamp_str: Value of the ``X-InfinAssistant-Timestamp`` header (Unix seconds as string).
            raw_body:      Raw request body bytes (read before JSON parsing).
            signature_hex: Value of the ``X-InfinAssistant-Signature`` header.
        """
        # 1. Parse and range-check timestamp
        try:
            req_time = float(timestamp_str)
        except (ValueError, TypeError):
            return HmacResult(valid=False, error="invalid_timestamp_format", used_old_key=False)

        now = time.time()
        skew = abs(now - req_time)
        if skew > self._replay_window:
            return HmacResult(
                valid=False,
                error=f"timestamp_outside_window (skew={skew:.1f}s, window={self._replay_window}s)",
                used_old_key=False,
            )

        # 2. Build canonical payload
        canonical = (
            device_id.encode()
            + b":"
            + timestamp_str.encode()
            + b":"
            + raw_body
        )

        # 3. Check current key
        expected = self._compute_hmac(self._secret, canonical)
        try:
            if hmac.compare_digest(expected, signature_hex.lower()):
                return HmacResult(valid=True, error=None, used_old_key=False)
        except (TypeError, AttributeError):
            return HmacResult(valid=False, error="malformed_signature", used_old_key=False)

        # 4. Check old key if within grace period
        if self._old_secret and self._rotation_time is not None:
            grace_elapsed = now - self._rotation_time
            if grace_elapsed < HMAC_GRACE_PERIOD:
                old_expected = self._compute_hmac(self._old_secret, canonical)
                if hmac.compare_digest(old_expected, signature_hex.lower()):
                    _LOGGER.debug(
                        "Request authenticated with old (rotated) key — grace period "
                        "expires in %.0f seconds",
                        HMAC_GRACE_PERIOD - grace_elapsed,
                    )
                    return HmacResult(valid=True, error=None, used_old_key=True)

        return HmacResult(valid=False, error="signature_mismatch", used_old_key=False)

    def clock_skew_seconds(self, timestamp_str: str) -> float | None:
        """Return clock skew between HA and the device, or None on parse error."""
        try:
            return abs(time.time() - float(timestamp_str))
        except (ValueError, TypeError):
            return None

    # ----------------------------------------------------------------- private

    @staticmethod
    def _compute_hmac(key: bytes, payload: bytes) -> str:
        """Return the lower-case hex HMAC-SHA256 digest."""
        return hmac.new(key, payload, hashlib.sha256).hexdigest()


# ---------------------------------------------------------------------------

class _BucketState:
    """Mutable token-bucket state for one device."""

    __slots__ = ("tokens", "last_refill", "total_consumed")

    def __init__(self, capacity: float) -> None:
        self.tokens: float = capacity
        self.last_refill: float = time.monotonic()
        self.total_consumed: int = 0


class TokenBucketRateLimiter:
    """Token-bucket rate limiter keyed by device_id.

    Capacity equals the configured request-per-minute limit.  Tokens refill
    continuously at ``capacity / 60`` tokens per second.  An initial burst of
    ``RATE_LIMIT_BURST`` extra tokens is granted to accommodate Doze-mode
    wake-ups where several queued requests arrive at once.
    """

    def __init__(self, rate_limit: int = DEFAULT_RATE_LIMIT) -> None:
        """Initialise the limiter.

        Args:
            rate_limit: Maximum requests per minute (30-120).
        """
        self._capacity: float = float(max(30, min(120, rate_limit)))
        self._refill_rate: float = self._capacity / 60.0  # tokens per second
        self._buckets: dict[str, _BucketState] = {}

    # ------------------------------------------------------------------ public

    def allow(self, device_id: str) -> bool:
        """Return True if the request is within the rate limit, False if it should be rejected.

        Args:
            device_id: Identifier of the requesting device.
        """
        bucket = self._buckets.get(device_id)
        now = time.monotonic()

        if bucket is None:
            # New device — start with capacity + burst so first batch is allowed
            bucket = _BucketState(self._capacity + RATE_LIMIT_BURST)
            self._buckets[device_id] = bucket

        # Refill based on elapsed time
        elapsed = now - bucket.last_refill
        bucket.tokens = min(
            self._capacity + RATE_LIMIT_BURST,
            bucket.tokens + elapsed * self._refill_rate,
        )
        bucket.last_refill = now

        if bucket.tokens >= 1.0:
            bucket.tokens -= 1.0
            bucket.total_consumed += 1
            return True

        return False

    def consumed_count(self, device_id: str) -> int:
        """Return the total number of requests consumed by *device_id* this session."""
        bucket = self._buckets.get(device_id)
        return bucket.total_consumed if bucket else 0

    def prune(self, max_idle_seconds: float = 3600.0) -> None:
        """Remove stale bucket entries for devices that haven't sent data recently.

        Should be called periodically (e.g. from an hourly HA job) to avoid
        unbounded memory growth in long-running deployments.

        Args:
            max_idle_seconds: Remove entries idle longer than this value.
        """
        now = time.monotonic()
        stale = [
            did
            for did, b in self._buckets.items()
            if (now - b.last_refill) > max_idle_seconds
        ]
        for did in stale:
            del self._buckets[did]
