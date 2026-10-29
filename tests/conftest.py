"""Shared fixtures and HA mock infrastructure for InfinAssistant tests."""
from __future__ import annotations

import asyncio
import json
import sys
from dataclasses import dataclass
from types import ModuleType
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# ---------------------------------------------------------------------------
# Stub out heavy Home Assistant packages so we can import the custom component
# without a full HA installation.
# ---------------------------------------------------------------------------


def _make_module(name: str, attrs: dict[str, Any] | None = None) -> ModuleType:
    """Create a stub module and register it in sys.modules."""
    mod = ModuleType(name)
    if attrs:
        for k, v in attrs.items():
            setattr(mod, k, v)
    sys.modules[name] = mod
    return mod


# --- homeassistant top-level -------------------------------------------------

_make_module("homeassistant")
_make_module("homeassistant.const", {"Platform": MagicMock()})


class _FakeConfigEntry:
    """Minimal stand-in for homeassistant.config_entries.ConfigEntry."""

    def __init__(
        self,
        *,
        data: dict | None = None,
        entry_id: str = "test_entry",
        options: dict | None = None,
    ):
        self.data = data or {}
        self.entry_id = entry_id
        # Real ConfigEntry always exposes `options` (empty mapping when the
        # options flow has never run). Omitting it here let production code
        # that reads entry.options pass tests and fail at runtime.
        self.options = options or {}


class _FakeConfigFlow:
    """Minimal stand-in for ConfigFlow."""

    domain = None

    def __init_subclass__(cls, domain: str = "", **kwargs):
        super().__init_subclass__(**kwargs)
        cls.domain = domain

    async def async_set_unique_id(self, uid):
        self._unique_id = uid

    def _abort_if_unique_id_configured(self):
        pass

    def async_show_form(self, **kwargs):
        return {"type": "form", **kwargs}

    def async_create_entry(self, **kwargs):
        return {"type": "create_entry", **kwargs}

    def async_abort(self, **kwargs):
        return {"type": "abort", **kwargs}

    @property
    def hass(self):
        return getattr(self, "_hass", None)


class _FakeOptionsFlow:
    """Minimal stand-in for OptionsFlow, as Home Assistant 2025.12 and later have it.

    The flow manager sets ``hass`` and ``handler`` (the entry ID) after the
    flow is built, and ``config_entry`` is a property that looks the entry up
    from them. It has no setter: an options flow that assigns it raises
    AttributeError, so the options dialog fails to open, and reading it before
    the flow manager has set the flow up raises ValueError.
    """

    hass = None
    handler = None

    @property
    def config_entry(self):
        if self.hass is None or self.handler is None:
            raise ValueError("The config entry is not available during initialisation")
        return self.hass.config_entries.async_get_known_entry(self.handler)

    def async_show_form(self, **kwargs):
        return {"type": "form", **kwargs}

    def async_create_entry(self, **kwargs):
        return {"type": "create_entry", **kwargs}


_config_entries_mod = _make_module(
    "homeassistant.config_entries",
    {
        "ConfigEntry": _FakeConfigEntry,
        "ConfigFlow": _FakeConfigFlow,
        "OptionsFlow": _FakeOptionsFlow,
    },
)

# --- homeassistant.core -------------------------------------------------------


class _FakeServiceCall:
    """Minimal stand-in for ServiceCall."""

    def __init__(self, data: dict):
        self.data = data


class _SupportsResponse:
    ONLY = "only"


_make_module(
    "homeassistant.core",
    {
        "HomeAssistant": MagicMock,
        "ServiceCall": _FakeServiceCall,
        "ServiceResponse": dict,
        "SupportsResponse": _SupportsResponse,
    },
)

# --- homeassistant.exceptions --------------------------------------------------


class _ServiceValidationError(Exception):
    """Stand-in for HA ServiceValidationError."""


class _ConfigEntryNotReady(Exception):
    """Stand-in for HA ConfigEntryNotReady — signals retry-with-backoff."""


_make_module(
    "homeassistant.exceptions",
    {
        "ServiceValidationError": _ServiceValidationError,
        "ConfigEntryNotReady": _ConfigEntryNotReady,
    },
)

# --- homeassistant.helpers / helpers sub-modules --------------------------------

_make_module("homeassistant.helpers")
_make_module("homeassistant.helpers.typing", {"ConfigType": dict})
_make_module("homeassistant.helpers.aiohttp_client", {"async_get_clientsession": MagicMock()})
_make_module("homeassistant.helpers.device_registry", {"async_get": MagicMock()})
_make_module("homeassistant.helpers.entity_registry", {"async_get": MagicMock()})
_make_module(
    "homeassistant.helpers.network",
    {"get_url": MagicMock(return_value="http://homeassistant.local:8123")},
)


def _async_track_time_interval(hass, callback, interval):
    """Test stand-in: record the scheduled callback and return a canceller.

    Tests can invoke ``hass._scheduled_callbacks[-1]`` to drive the prune
    timer manually.
    """
    if not hasattr(hass, "_scheduled_callbacks"):
        hass._scheduled_callbacks = []
    hass._scheduled_callbacks.append((callback, interval))

    def _cancel():
        # Mark the latest registration cancelled — tests can assert .called.
        _cancel.called = True

    _cancel.called = False
    return _cancel


_make_module(
    "homeassistant.helpers.event",
    {"async_track_time_interval": _async_track_time_interval},
)


def _cv_string(val):
    """Voluptuous validator: coerce to str."""
    if val is None:
        raise Exception("string required")
    return str(val)


def _cv_boolean(val):
    """Voluptuous validator: coerce to bool."""
    if isinstance(val, bool):
        return val
    if isinstance(val, str):
        if val.lower() in ("true", "yes", "on", "1"):
            return True
        if val.lower() in ("false", "no", "off", "0"):
            return False
    if isinstance(val, int):
        return bool(val)
    raise Exception(f"Cannot coerce {val!r} to boolean")


def _ensure_list(val):
    """Ensure value is a list."""
    if val is None:
        return []
    if isinstance(val, list):
        return val
    return [val]


_make_module(
    "homeassistant.helpers.config_validation",
    {
        "string": _cv_string,
        "boolean": _cv_boolean,
        "ensure_list": _ensure_list,
    },
)

# --- homeassistant.components.webhook -----------------------------------------

_make_module(
    "homeassistant.components",
)
# persistent_notification is imported as a module — the hass.components.<x>
# accessor it replaced was removed from Home Assistant — so it must exist both
# in sys.modules and as an attribute of homeassistant.components.
_pn = _make_module(
    "homeassistant.components.persistent_notification",
    {"async_create": MagicMock(), "async_dismiss": MagicMock()},
)
setattr(sys.modules["homeassistant.components"], "persistent_notification", _pn)
_make_module(
    "homeassistant.components.webhook",
    {
        "async_register": MagicMock(),
        "async_unregister": MagicMock(),
    },
)

# --- homeassistant.components.frontend / http (the card module) ----------------


@dataclass(frozen=True)
class _FakeStaticPathConfig:
    """Stand-in for homeassistant.components.http.StaticPathConfig (HA 2024.7+)."""

    url_path: str
    path: str
    cache_headers: bool = True


_make_module("homeassistant.components.frontend", {"add_extra_js_url": MagicMock()})
_make_module("homeassistant.components.http", {"StaticPathConfig": _FakeStaticPathConfig})

# --- homeassistant.helpers.entity_platform ------------------------------------

_make_module(
    "homeassistant.helpers.entity_platform",
    {"AddEntitiesCallback": MagicMock},
)

# --- homeassistant.helpers.update_coordinator ---------------------------------


class _FakeDataUpdateCoordinator:
    """Minimal stand-in for DataUpdateCoordinator."""

    def __init__(self, hass, logger, *, name, update_interval):
        self.hass = hass
        self.logger = logger
        self.name = name
        self.update_interval = update_interval
        self.data: dict[str, Any] = {}
        self.last_update_success = True

    async def async_config_entry_first_refresh(self):
        self.data = await self._async_update_data()

    async def async_set_updated_data(self, data):
        self.data = data

    async def _async_update_data(self):
        return self.data


class _FakeCoordinatorEntity:
    """Minimal stand-in for CoordinatorEntity."""

    def __init__(self, coordinator, *args, **kwargs):
        self.coordinator = coordinator


_make_module(
    "homeassistant.helpers.update_coordinator",
    {
        "DataUpdateCoordinator": _FakeDataUpdateCoordinator,
        "CoordinatorEntity": _FakeCoordinatorEntity,
    },
)


# --- homeassistant.helpers.storage --------------------------------------------


class _FakeStore:
    """In-memory stand-in for homeassistant.helpers.storage.Store.

    Round-trips JSON-serialisable data without touching the filesystem.
    Tests can pre-seed by writing to ``hass.data['_fake_store'][key]`` before
    constructing the coordinator, or inspect the same dict afterwards.
    """

    _shared: dict[str, Any] = {}

    def __init__(self, hass, version, key):
        self._key = f"{key}@v{version}"

    async def async_load(self):
        return type(self)._shared.get(self._key)

    async def async_save(self, data):
        type(self)._shared[self._key] = data


_make_module(
    "homeassistant.helpers.storage",
    {"Store": _FakeStore},
)

# --- homeassistant.components.sensor ------------------------------------------


class _FakeSensorDeviceClass:
    BATTERY = "battery"
    TEMPERATURE = "temperature"
    HUMIDITY = "humidity"


class _FakeSensorStateClass:
    MEASUREMENT = "measurement"
    TOTAL_INCREASING = "total_increasing"


class _FakeSensorEntity:
    """Minimal stand-in for SensorEntity."""
    pass


class _FakeSensorEntityDescription:
    """Minimal stand-in for SensorEntityDescription (dataclass-like)."""

    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)


_make_module("homeassistant.components.sensor", {
    "SensorDeviceClass": _FakeSensorDeviceClass,
    "SensorEntity": _FakeSensorEntity,
    "SensorEntityDescription": _FakeSensorEntityDescription,
    "SensorStateClass": _FakeSensorStateClass,
})


class _FakeEntityCategory:
    DIAGNOSTIC = "diagnostic"
    CONFIG = "config"
    SYSTEM = "system"


_make_module("homeassistant.helpers.entity", {"EntityCategory": _FakeEntityCategory})

# --- homeassistant.components.binary_sensor -----------------------------------


class _FakeBinarySensorDeviceClass:
    CONNECTIVITY = "connectivity"
    BATTERY_CHARGING = "battery_charging"


class _FakeBinarySensorEntity:
    """Minimal stand-in for BinarySensorEntity."""
    pass


_make_module("homeassistant.components.binary_sensor", {
    "BinarySensorDeviceClass": _FakeBinarySensorDeviceClass,
    "BinarySensorEntity": _FakeBinarySensorEntity,
})

# --- homeassistant.util -------------------------------------------------------

_make_module("homeassistant.util")


class _FakeDtUtil:
    @staticmethod
    def utcnow():
        from datetime import datetime, timezone

        return datetime.now(timezone.utc)

    @staticmethod
    def utc_from_timestamp(ts):
        from datetime import datetime, timezone

        return datetime.fromtimestamp(ts, tz=timezone.utc)

    @staticmethod
    def parse_datetime(value):
        """Mirror homeassistant.util.dt.parse_datetime: None on bad input."""
        from datetime import datetime

        if not isinstance(value, str):
            return None
        try:
            # Real HA accepts a trailing 'Z'; fromisoformat only does from 3.11.
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            return None


_make_module(
    "homeassistant.util.dt",
    {
        "utcnow": _FakeDtUtil.utcnow,
        "utc_from_timestamp": _FakeDtUtil.utc_from_timestamp,
        "parse_datetime": _FakeDtUtil.parse_datetime,
    },
)

# --- aiohttp stub (minimal) ---------------------------------------------------

_make_module("aiohttp", {"ContentTypeError": type("ContentTypeError", (Exception,), {}), "web": MagicMock()})
_make_module("aiohttp.web", {"Response": MagicMock})

# ==============================================================================
# Now that HA stubs are in place we can safely import the actual component code.
# We need to *reload* aiohttp.web.Response so it captures real kwargs.
# ==============================================================================

from aiohttp.web import Response as _AiohttpResponseStub  # noqa: E402 (used below)


class FakeResponse:
    """A lightweight aiohttp.web.Response stand-in that captures status + text."""

    def __init__(self, *, status: int = 200, text: str = ""):
        self.status = status
        self.text = text


# Patch aiohttp.web.Response globally so handle_webhook uses our version.
sys.modules["aiohttp.web"].Response = FakeResponse
sys.modules["aiohttp"].web.Response = FakeResponse


# ==============================================================================
# Fixtures
# ==============================================================================


class FakeRequest:
    """Mimics an aiohttp.web.Request with controllable JSON / raw body."""

    def __init__(
        self,
        body: Any = None,
        *,
        raw: str | None = None,
        raise_on_json: Exception | None = None,
        raise_on_read: Exception | None = None,
        headers: dict[str, str] | None = None,
    ):
        self._body = body
        self._raw = raw
        self._raise = raise_on_json
        self._raise_read = raise_on_read
        self.headers = headers or {}

    async def json(self):
        if self._raise:
            raise self._raise
        if self._raw is not None:
            return json.loads(self._raw)
        return self._body

    async def read(self):
        """Return the raw request body as bytes (matches aiohttp.web.Request)."""
        if self._raise_read:
            raise self._raise_read
        if self._raw is not None:
            return self._raw.encode("utf-8") if isinstance(self._raw, str) else self._raw
        if self._body is None:
            return b""
        if isinstance(self._body, (bytes, bytearray)):
            return bytes(self._body)
        if isinstance(self._body, str):
            return self._body.encode("utf-8")
        return json.dumps(self._body).encode("utf-8")


@pytest.fixture
def hass():
    """Return a minimal mock HomeAssistant instance."""
    mock_hass = MagicMock()
    mock_hass.data = {}
    mock_hass.bus = MagicMock()
    mock_hass.bus.async_fire = MagicMock()
    mock_hass.services = MagicMock()
    mock_hass.services.has_service = MagicMock(return_value=False)
    mock_hass.services.async_register = MagicMock()
    mock_hass.services.async_remove = MagicMock()
    mock_hass.config_entries = MagicMock()
    return mock_hass


@pytest.fixture
def webhook_id():
    return "test_webhook_abc123"


@pytest.fixture
def device_id():
    return "pinetime_test_01"


@pytest.fixture
def make_hass_with_entry(hass, webhook_id, device_id):
    """Return hass populated with one config entry worth of data."""

    def _factory(*, wh_id=None, dev_id=None, entry_id="entry_1"):
        wh = wh_id or webhook_id
        dev = dev_id or device_id
        coordinator = MagicMock()
        coordinator.update_from_webhook = AsyncMock()
        # Rate-limiter and authenticator entries are required by handle_webhook
        # since REQ-049 / REQ-048 wired them into the lookup path. Mock both
        # with permissive defaults so tests can opt in to enforcement.
        rate_limiter = MagicMock()
        rate_limiter.allow = MagicMock(return_value=True)
        rate_limiter.consumed_count = MagicMock(return_value=0)
        hass.data.setdefault("infinassistant", {})
        hass.data["infinassistant"][entry_id] = {
            "webhook_id": wh,
            "device_id": dev,
            "coordinator": coordinator,
            "rate_limiter": rate_limiter,
            "authenticator": None,
        }
        return hass, coordinator

    return _factory
