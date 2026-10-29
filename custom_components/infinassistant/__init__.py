"""The InfinAssistant integration."""
from __future__ import annotations

import json
import logging
import os
import time
from datetime import timedelta
from typing import Any

import aiohttp
from aiohttp import web

from homeassistant.components import persistent_notification
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.components import webhook
from homeassistant.exceptions import ConfigEntryNotReady
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.helpers.typing import ConfigType
from homeassistant.helpers import device_registry as dr, entity_registry as er
from homeassistant.helpers.network import get_url
from homeassistant.util import dt as dt_util

from .const import (
    DOMAIN,
    CONF_WEBHOOK_ID,
    CONF_DEVICE_ID,
    CONF_HMAC_SECRET,
    CONF_HMAC_OLD_SECRET,
    CONF_HMAC_ROTATION_TIME,
    CONF_REPLAY_WINDOW,
    CONF_RATE_LIMIT,
    DEFAULT_REPLAY_WINDOW,
    DEFAULT_RATE_LIMIT,
    SENSOR_RANGES,
    SENSOR_NO_READING,
    TEXT_SENSOR_KEYS,
    MAX_TEXT_SENSOR_LEN,
    HMAC_FAILURE_ALERT_THRESHOLD,
    HMAC_FAILURE_WINDOW,
    HMAC_EXPIRY_WARNING,
    HMAC_GRACE_PERIOD,
    CONF_UPDATE_INTERVAL,
    DEFAULT_UPDATE_INTERVAL,
    CONF_CONNECTED_THRESHOLD,
    DEFAULT_CONNECTED_THRESHOLD,
)
from .card import async_register_card
from .coordinator import InfinassistantDataCoordinator
from .security import (
    WebhookAuthenticator,
    TokenBucketRateLimiter,
    InvalidHmacSecretError,
    HEADER_DEVICE_ID,
    HEADER_TIMESTAMP,
    HEADER_SIGNATURE,
)

# REQ-049 — how often to prune idle rate-limiter buckets. One hour matches the
# TokenBucketRateLimiter.prune() default max_idle_seconds.
_RATE_LIMITER_PRUNE_INTERVAL = timedelta(hours=1)
from .services import async_setup_services, async_unload_services
from .device_id import normalize_device_id as _normalize_device_id

_LOGGER = logging.getLogger(__name__)

# Structural validation constants
MAX_DEVICE_ID_LEN = 256
MAX_SENSORS = 100

PLATFORMS: list[Platform] = [Platform.SENSOR, Platform.BINARY_SENSOR]

# Clock-skew threshold above which we include server_time_utc in the 200 response
_CLOCK_SKEW_REPORT_THRESHOLD = 5  # seconds

# REQ-047 — webhook request body size cap. 65,536 bytes = 64 KiB is well above
# the largest legitimate watchface layout the Android bridge sends (the firmware
# CBOR reassembly buffer is 8 KiB) but small enough that a 50 MiB POST cannot
# blow HA's memory budget before being rejected. Returned as 413 with no body.
_MAX_WEBHOOK_BODY_BYTES = 65536

# Per-entry HMAC failure tracking: entry_id → list of failure timestamps
_hmac_failures: dict[str, list[float]] = {}

# Per-entry "alert already active" flag so we don't flood notifications
_hmac_alert_active: dict[str, bool] = {}


def _residual_storage_files(storage_path: str) -> list[str]:
    """The files in .storage/ left by the old "infinissistant" spelling.

    Lists a directory, which is blocking I/O, so it runs in the executor:
    Home Assistant 2024.6 and later report blocking calls on the event loop.
    """
    if not os.path.isdir(storage_path):
        return []
    return [name for name in os.listdir(storage_path) if "infinissistant" in name]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the InfinAssistant component."""
    hass.data.setdefault(DOMAIN, {})

    # Check for stale domain entries from the old "infinissistant" spelling
    residual = await hass.async_add_executor_job(
        _residual_storage_files, hass.config.path(".storage")
    )
    for filename in residual:
        _LOGGER.warning(
            "Found residual 'infinissistant' entry in .storage/: %s — "
            "this is from the old integration name. Please remove the old "
            "integration and re-add using the new 'infinassistant' name. "
            "See migration guide for details.",
            filename,
        )

    # Register services (only once for the integration)
    await async_setup_services(hass)

    # The Lovelace card, served from the integration: here, not per entry, so once per start.
    await async_register_card(hass)

    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up InfinAssistant from a config entry."""
    # Re-register services if they were removed during a prior entry unload (e.g. reload).
    # async_setup() only runs once at startup, so services must be re-registered here.
    if not hass.services.has_service(DOMAIN, "push_watchface_layout"):
        await async_setup_services(hass)

    webhook_id = entry.data[CONF_WEBHOOK_ID]
    device_id = entry.data.get(CONF_DEVICE_ID, "unknown")

    _LOGGER.info(
        "Setting up InfinAssistant integration for device %s with webhook %s",
        device_id,
        webhook_id,
    )

    # Build security objects for this entry
    rate_limit = entry.options.get(CONF_RATE_LIMIT, DEFAULT_RATE_LIMIT)
    rate_limiter = TokenBucketRateLimiter(rate_limit=int(rate_limit))

    hmac_secret = entry.data.get(CONF_HMAC_SECRET)
    if hmac_secret:
        try:
            authenticator = WebhookAuthenticator(
                secret_b64=hmac_secret,
                old_secret_b64=entry.data.get(CONF_HMAC_OLD_SECRET),
                rotation_time=entry.data.get(CONF_HMAC_ROTATION_TIME),
                replay_window=int(
                    entry.options.get(CONF_REPLAY_WINDOW, DEFAULT_REPLAY_WINDOW)
                ),
            )
        except InvalidHmacSecretError as err:
            # REQ-050 — corrupt HMAC secret (e.g. a botched manual edit of
            # .storage/core.config_entries) must fail setup loudly so the user
            # is prompted to re-rotate, not silently degrade to unauthenticated.
            _LOGGER.error(
                "HMAC secret for device %s is unusable: %s — please rotate the key",
                device_id,
                err,
            )
            raise ConfigEntryNotReady(
                f"Invalid HMAC secret for device {device_id}: {err}. "
                f"Open the integration options and rotate the key."
            ) from err
    else:
        authenticator = None
        _LOGGER.warning(
            "No HMAC secret configured for device %s — webhook is unauthenticated",
            device_id,
        )

    # Create the data coordinator with configurable polling interval
    update_interval = int(
        entry.options.get(CONF_UPDATE_INTERVAL, DEFAULT_UPDATE_INTERVAL)
    )
    connected_threshold = entry.options.get(
        CONF_CONNECTED_THRESHOLD, DEFAULT_CONNECTED_THRESHOLD
    )
    coordinator = InfinassistantDataCoordinator(
        hass, device_id, update_interval, connected_threshold
    )

    # REQ-051 — rehydrate the persisted watchface layout (if any) before
    # entities start asking get_watchface so a restart doesn't transiently
    # report "no layout configured."
    await coordinator.async_load_persisted_layout()

    # Perform initial refresh to make sensors available immediately
    await coordinator.async_config_entry_first_refresh()

    # REQ-049 — schedule periodic prune of idle rate-limiter buckets so a
    # long-running deployment with rotating-MAC devices (or misconfigured
    # clients hammering with valid HMACs against random device IDs) cannot
    # grow the bucket map unbounded. Hourly cadence matches prune()'s default
    # max_idle_seconds.
    def _prune_rate_limiter(_now) -> None:
        try:
            rate_limiter.prune()
        except Exception:  # noqa: BLE001 — never let the scheduler escape
            _LOGGER.exception("Rate-limiter prune failed for entry %s", entry.entry_id)

    cancel_prune = async_track_time_interval(
        hass, _prune_rate_limiter, _RATE_LIMITER_PRUNE_INTERVAL
    )

    # Initialize data storage for this entry
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = {
        "webhook_id": webhook_id,
        "device_id": device_id,
        "coordinator": coordinator,
        "authenticator": authenticator,
        "rate_limiter": rate_limiter,
        "cancel_prune": cancel_prune,
    }

    # Initialise per-entry failure tracking
    _hmac_failures.setdefault(entry.entry_id, [])
    _hmac_alert_active.setdefault(entry.entry_id, False)

    # Unregister webhook first if it exists (handles reload/re-enable cases)
    try:
        webhook.async_unregister(hass, webhook_id)
        _LOGGER.debug("Unregistered existing webhook: %s", webhook_id)
    except ValueError:
        pass

    # Register webhook handler
    webhook.async_register(
        hass,
        DOMAIN,
        "InfinAssistant Sensor Data",
        webhook_id,
        handle_webhook,
    )

    _LOGGER.debug("Registered webhook: /api/webhook/%s", webhook_id)

    # Get Home Assistant base URL
    try:
        ha_base_url = get_url(hass, prefer_external=False)
    except Exception as err:
        _LOGGER.warning("Failed to get HA URL, using fallback: %s", err)
        ha_base_url = "http://homeassistant.local:8123"

    # Register device in device registry
    device_registry = dr.async_get(hass)
    device = device_registry.async_get_or_create(
        config_entry_id=entry.entry_id,
        identifiers={(DOMAIN, device_id)},
        name=f"PineTime {device_id}",
        manufacturer="Pine64",
        model="PineTime",
        sw_version="InfiniTime",
        configuration_url=f"{ha_base_url}/api/webhook/{webhook_id}",
    )

    if device.disabled:
        _LOGGER.info("Device %s was disabled, enabling it now", device_id)
        device_registry.async_update_device(device.id, disabled_by=None)

    _LOGGER.debug("Registered device in device registry: %s (enabled)", device_id)

    webhook_url = f"{ha_base_url}/api/webhook/{webhook_id}"
    _LOGGER.info(
        "InfinAssistant webhook available at: %s (device: %s)",
        webhook_url,
        device_id,
    )

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    # Schedule periodic grace-period expiry checks if a rotation is in progress
    if entry.data.get(CONF_HMAC_ROTATION_TIME):
        _schedule_rotation_expiry_check(hass, entry)

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    webhook_id = entry.data[CONF_WEBHOOK_ID]

    _LOGGER.info("Unloading InfinAssistant integration with webhook %s", webhook_id)

    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)

    if unload_ok:
        webhook.async_unregister(hass, webhook_id)
        _LOGGER.debug("Unregistered webhook: %s", webhook_id)

        # REQ-049 — cancel the rate-limiter prune timer before dropping the
        # entry data, otherwise the callback fires against a freed rate_limiter.
        entry_data = hass.data[DOMAIN].get(entry.entry_id, {})
        cancel_prune = entry_data.get("cancel_prune")
        if cancel_prune is not None:
            cancel_prune()

        hass.data[DOMAIN].pop(entry.entry_id, None)
        _hmac_failures.pop(entry.entry_id, None)
        _hmac_alert_active.pop(entry.entry_id, None)

        if not hass.data[DOMAIN]:
            await async_unload_services(hass)

    return unload_ok


# ─────────────────────────────────────────────────────────────── webhook ──────


async def handle_webhook(
    hass: HomeAssistant,
    webhook_id: str,
    request: Any,
) -> web.Response:
    """Handle incoming webhook from Android bridge app."""

    # ── 1. Find config entry for this webhook ─────────────────────────────────
    entry_id = None
    for config_entry_id, entry_data in hass.data[DOMAIN].items():
        if entry_data.get("webhook_id") == webhook_id:
            entry_id = config_entry_id
            break

    if not entry_id:
        _LOGGER.warning("No config entry found for webhook %s", webhook_id)
        return web.Response(status=404, text="Webhook not configured")

    entry_data = hass.data[DOMAIN][entry_id]
    authenticator: WebhookAuthenticator | None = entry_data.get("authenticator")
    rate_limiter: TokenBucketRateLimiter = entry_data["rate_limiter"]

    # ── 2. Read raw body (must happen before JSON parsing for HMAC) ───────────
    # REQ-047 — short-circuit on declared Content-Length above the cap so HA
    # never allocates a 50 MiB buffer before learning the request is bogus.
    # Servers may omit Content-Length (chunked or proxy-stripped); in that
    # case we still cap via the cumulative-size check after read() below.
    try:
        content_length_hdr = request.headers.get("Content-Length")
    except Exception:
        content_length_hdr = None
    if content_length_hdr is not None:
        try:
            declared = int(content_length_hdr)
        except (TypeError, ValueError):
            declared = -1
        if declared > _MAX_WEBHOOK_BODY_BYTES:
            _LOGGER.warning(
                "Webhook body too large: Content-Length=%s > cap=%d",
                content_length_hdr,
                _MAX_WEBHOOK_BODY_BYTES,
            )
            return web.Response(status=413, text="Payload too large")

    try:
        raw_body = await request.read()
    except Exception as err:
        _LOGGER.error("Failed to read request body: %s", err)
        return web.Response(status=400, text="Failed to read body")

    # REQ-047 — backstop for clients that lied about / omitted Content-Length.
    if len(raw_body) > _MAX_WEBHOOK_BODY_BYTES:
        _LOGGER.warning(
            "Webhook body too large after read: %d > cap=%d",
            len(raw_body),
            _MAX_WEBHOOK_BODY_BYTES,
        )
        return web.Response(status=413, text="Payload too large")

    # ── 3. HMAC verification (FR-SEC-1) ───────────────────────────────────────
    if authenticator is not None:
        hdr_device_id = request.headers.get(HEADER_DEVICE_ID, "")
        hdr_timestamp = request.headers.get(HEADER_TIMESTAMP, "")
        hdr_signature = request.headers.get(HEADER_SIGNATURE, "")

        if not hdr_device_id or not hdr_timestamp or not hdr_signature:
            _record_hmac_failure(hass, entry_id, hdr_device_id or "unknown")
            _LOGGER.warning(
                "Missing HMAC headers from device %.8s — rejecting",
                hdr_device_id or "unknown",
            )
            return web.Response(status=401, text="Missing authentication headers")

        result = authenticator.verify(
            device_id=hdr_device_id,
            timestamp_str=hdr_timestamp,
            raw_body=raw_body,
            signature_hex=hdr_signature,
        )

        if not result.valid:
            _record_hmac_failure(hass, entry_id, hdr_device_id)
            _LOGGER.warning(
                "HMAC verification failed for device %.8s: %s",
                hdr_device_id,
                result.error,
            )
            return web.Response(status=401, text="Signature verification failed")

        # Successful auth — clear any outstanding alert
        if _hmac_alert_active.get(entry_id):
            _hmac_alert_active[entry_id] = False
            persistent_notification.async_dismiss(
                hass,
                notification_id=f"{DOMAIN}_hmac_alert_{entry_id}"
            )

        # Detect meaningful clock skew on the first successful post-restart call
        skew = authenticator.clock_skew_seconds(hdr_timestamp)
        clock_skew_note: dict[str, Any] = {}
        if skew is not None and skew > _CLOCK_SKEW_REPORT_THRESHOLD:
            clock_skew_note["server_time_utc"] = dt_util.utcnow().isoformat()

    else:
        hdr_device_id = ""
        clock_skew_note = {}

    # ── 4. Rate limiting (FR-SEC-2) ───────────────────────────────────────────
    # Use the HMAC-verified device-id header if available, else fall back to payload
    rl_device_id = hdr_device_id or entry_data.get("device_id", "unknown")

    if not rate_limiter.allow(rl_device_id):
        consumed = rate_limiter.consumed_count(rl_device_id)
        _LOGGER.warning(
            "Rate limit exceeded for device %.8s (consumed=%d this session)",
            rl_device_id,
            consumed,
        )
        return web.Response(status=429, text="Too many requests")

    # ── 5. Parse JSON ─────────────────────────────────────────────────────────
    try:
        data = json.loads(raw_body)
        _LOGGER.debug("Received webhook data: %s", data)
    except (ValueError, json.JSONDecodeError) as err:
        _LOGGER.error("Error parsing webhook JSON: %s", err)
        return web.Response(status=400, text="Invalid JSON")

    # ── 6. Structural validation ──────────────────────────────────────────────
    if not isinstance(data, dict):
        _LOGGER.warning("Invalid webhook payload: expected dict, got %s", type(data))
        return web.Response(status=400, text="Expected JSON object")

    message_type = data.get("type")
    if message_type != "sensor_update":
        _LOGGER.warning("Unknown message type: %s", message_type)
        return web.Response(status=400, text=f"Unknown type: {message_type}")

    device_id = data.get("device_id", "unknown")
    timestamp = data.get("timestamp")
    sensors = data.get("sensors", {})

    if not isinstance(device_id, str) or len(device_id) > MAX_DEVICE_ID_LEN:
        _LOGGER.warning("Invalid device_id in webhook: too long or wrong type")
        return web.Response(status=422, text="Invalid device_id")

    # REQ-048 — three-way device_id consistency. HMAC verifies the header so
    # the header value is trusted (forged headers can't pass step 3). After
    # parsing JSON, require that the payload's device_id and the configured
    # entry device_id agree with the verified header — after the same
    # normalization used by the config flow (REQ-044), so a legitimate device
    # that varies casing or MAC separators is not falsely rejected.
    if authenticator is not None:
        entry_device_id = entry_data.get("device_id", "")
        norm_hdr = _normalize_device_id(hdr_device_id)
        norm_payload = _normalize_device_id(device_id)
        norm_entry = _normalize_device_id(entry_device_id)
        if not (norm_hdr and norm_hdr == norm_payload == norm_entry):
            _LOGGER.warning(
                "device_id mismatch: header=%.16s payload=%.16s entry=%.16s — rejecting",
                hdr_device_id,
                device_id,
                entry_device_id,
            )
            return web.Response(status=401, text="device_id mismatch")

    if not isinstance(sensors, dict) or len(sensors) > MAX_SENSORS:
        _LOGGER.warning("Invalid sensors in webhook: not a dict or too many entries")
        return web.Response(status=422, text="Invalid sensors")

    # Validate sensor values: numeric, except a short printable string for the
    # known text-state keys.
    for key, value in list(sensors.items()):
        if key in TEXT_SENSOR_KEYS and isinstance(value, str):
            if 0 < len(value) <= MAX_TEXT_SENSOR_LEN and value.isprintable():
                continue
            _LOGGER.warning("Invalid text sensor value for %s: rejected", key)
            sensors[key] = None
            continue
        if not isinstance(value, (int, float, type(None))):
            _LOGGER.warning("Invalid sensor value for %s: %s", key, type(value))
            sensors[key] = None

    # ── 7. Sensor range validation (FR-SEC-3) ─────────────────────────────────
    sensors = _validate_sensor_ranges(sensors, device_id, entry_data.get("coordinator"))

    if not sensors:
        _LOGGER.warning("No sensor data in payload after validation")
        return web.Response(status=422, text="No sensor data")

    if timestamp is not None:
        sensors["timestamp"] = timestamp

    # ── 8. Update coordinator ─────────────────────────────────────────────────
    try:
        coordinator = entry_data["coordinator"]
        await coordinator.update_from_webhook(sensors)
    except Exception as err:
        _LOGGER.exception("Unexpected error updating coordinator: %s", err)
        return web.Response(status=500, text="Internal error")

    _LOGGER.info(
        "Updated sensor data for device %s: %s",
        device_id,
        list(sensors.keys()),
    )

    # Include clock skew note if relevant
    if clock_skew_note:
        return web.Response(
            status=200,
            content_type="application/json",
            body=json.dumps({"status": "ok", **clock_skew_note}),
        )

    return web.Response(status=200, text="OK")


# ─────────────────────────────────────────────── security helper functions ───


def _validate_sensor_ranges(
    sensors: dict[str, Any],
    device_id: str,
    coordinator: InfinassistantDataCoordinator | None,
) -> dict[str, Any]:
    """Discard sensor values that are outside their valid ranges.

    Logs a warning for each discarded value and increments the violation
    counter on the coordinator (used by future diagnostic sensor FR-HUX-1).
    A value that means "no reading" (SENSOR_NO_READING, a heart rate of 0)
    becomes None without a warning or a violation.

    Args:
        sensors:    Parsed sensor dict from the webhook payload.
        device_id:  Device identifier for log messages.
        coordinator: Active coordinator for this entry (may be None during tests).

    Returns:
        Cleaned sensor dict (out-of-range values replaced with None).
    """
    for key, (lo, hi) in SENSOR_RANGES.items():
        raw_value = sensors.get(key)
        if raw_value is None:
            continue
        try:
            numeric = float(raw_value)
        except (ValueError, TypeError):
            continue
        if key in SENSOR_NO_READING and numeric == SENSOR_NO_READING[key]:
            # No reading: unknown, not a violation.
            sensors[key] = None
            continue
        if not (lo <= numeric <= hi):
            _LOGGER.warning(
                "Out-of-range sensor value discarded — entity=%s value=%s "
                "expected=[%s, %s] device=%s",
                key,
                raw_value,
                lo,
                hi,
                device_id,
            )
            sensors[key] = None
            if coordinator is not None:
                coordinator.increment_range_violation(key)

    return sensors


def _record_hmac_failure(
    hass: HomeAssistant, entry_id: str, device_id: str
) -> None:
    """Record an HMAC failure and create a persistent_notification when the
    threshold is exceeded within the tracking window.

    The device_id is truncated to the first 8 characters in all log output to
    avoid leaking full identifiers.
    """
    now = time.monotonic()
    failures = _hmac_failures.setdefault(entry_id, [])

    # Prune events outside the rolling window
    cutoff = now - HMAC_FAILURE_WINDOW
    _hmac_failures[entry_id] = [t for t in failures if t >= cutoff]
    _hmac_failures[entry_id].append(now)

    count = len(_hmac_failures[entry_id])

    if count >= HMAC_FAILURE_ALERT_THRESHOLD and not _hmac_alert_active.get(entry_id):
        _hmac_alert_active[entry_id] = True
        short_id = device_id[:8] if device_id else "unknown"
        _LOGGER.error(
            "HMAC failure threshold reached: %d failures in the last hour "
            "(device prefix: %.8s)",
            count,
            short_id,
        )
        persistent_notification.async_create(
            hass,
            title="InfinAssistant: Possible Attack Detected",
            message=(
                f"{count} failed HMAC verifications in the last hour from device "
                f"`{short_id}...`. "
                "This may indicate a replay attack or misconfigured key. "
                "Check your integration settings."
            ),
            notification_id=f"{DOMAIN}_hmac_alert_{entry_id}",
        )


def _schedule_rotation_expiry_check(
    hass: HomeAssistant, entry: ConfigEntry
) -> None:
    """Register a one-shot HA callback to warn when the rotation grace period
    is near expiry (T-10 minutes) and to dismiss the old key afterward."""
    rotation_time: float = entry.data.get(CONF_HMAC_ROTATION_TIME, 0.0)
    now = time.time()
    grace_remaining = HMAC_GRACE_PERIOD - (now - rotation_time)
    warn_in = grace_remaining - HMAC_EXPIRY_WARNING

    if warn_in > 0:
        import asyncio

        async def _warn_expiry() -> None:
            """Issue T-10 warning notification."""
            await asyncio.sleep(warn_in)
            if entry.entry_id not in hass.data.get(DOMAIN, {}):
                return  # entry was unloaded
            persistent_notification.async_create(
            hass,
                title="InfinAssistant: HMAC Key Rotation Expiring Soon",
                message=(
                    "The old webhook signing key will stop being accepted in "
                    "10 minutes. Ensure your bridge app has been updated to "
                    "use the new key."
                ),
                notification_id=f"{DOMAIN}_rotation_warning_{entry.entry_id}",
            )

        hass.async_create_task(_warn_expiry())
