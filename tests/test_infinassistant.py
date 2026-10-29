"""Tests for the InfinAssistant Home Assistant custom integration.

Covers five areas:
  1. Webhook handler (handle_webhook) — request parsing, validation, routing
  2. Service schema validation (voluptuous) — field requirements, ranges, extras
  3. Config flow — user step form display and entry creation; the options flow
  4. Coordinator — webhook update, concurrent updates, watchface storage
  5. Sensor / Binary sensor entities — availability, state, device info
"""
from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import voluptuous as vol

# conftest.py stubs HA modules before these imports execute.
from homeassistant.config_entries import ConfigEntry
from custom_components.infinassistant import (
    handle_webhook,
    MAX_DEVICE_ID_LEN,
    MAX_SENSORS,
    _residual_storage_files,
    async_setup,
)
from custom_components.infinassistant.services import (
    SEND_NOTIFICATION_SCHEMA,
    TRIGGER_VIBRATION_SCHEMA,
    SET_ALARM_SCHEMA,
    PUSH_WATCHFACE_LAYOUT_SCHEMA,
    GET_WATCHFACE_SCHEMA,
)
from custom_components.infinassistant.config_flow import InfinassistantConfigFlow, InfinassistantOptionsFlow
from custom_components.infinassistant.coordinator import InfinassistantDataCoordinator
from custom_components.infinassistant.const import (
    DOMAIN,
    CONF_DEVICE_ID,
    CONF_WEBHOOK_ID,
    CONF_HMAC_SECRET,
    CONF_HMAC_OLD_SECRET,
    CONF_RATE_LIMIT,
    CONF_REPLAY_WINDOW,
)

# FakeRequest and FakeResponse are defined in conftest.py.
from tests.conftest import FakeRequest, FakeResponse


def _fake_secret(text: str) -> str:
    """A base64 HMAC secret built at runtime, so no key-shaped literal sits in the source."""
    return base64.b64encode(text.encode()).decode()


# =============================================================================
# 1. WEBHOOK HANDLER TESTS
# =============================================================================


class TestWebhookValidSensorData:
    """Verify that a well-formed sensor_update payload returns 200."""

    @pytest.mark.asyncio
    async def test_valid_sensor_update_returns_200(self, make_hass_with_entry, webhook_id):
        hass, coordinator = make_hass_with_entry()
        request = FakeRequest(
            body={
                "type": "sensor_update",
                "device_id": "pinetime_01",
                "timestamp": 1700000000000,
                "sensors": {"steps": 1234, "heart_rate": 72, "battery_percent": 85},
            }
        )

        resp = await handle_webhook(hass, webhook_id, request)

        assert resp.status == 200
        assert resp.text == "OK"
        coordinator.update_from_webhook.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_valid_payload_with_null_sensor_values(self, make_hass_with_entry, webhook_id):
        """None is an acceptable sensor value (sensor offline)."""
        hass, coordinator = make_hass_with_entry()
        request = FakeRequest(
            body={
                "type": "sensor_update",
                "device_id": "pinetime_01",
                "sensors": {"heart_rate": None, "steps": 500},
            }
        )

        resp = await handle_webhook(hass, webhook_id, request)

        assert resp.status == 200
        coordinator.update_from_webhook.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_valid_payload_with_float_sensor_values(self, make_hass_with_entry, webhook_id):
        hass, coordinator = make_hass_with_entry()
        request = FakeRequest(
            body={
                "type": "sensor_update",
                "device_id": "pinetime_01",
                "sensors": {"battery_percent": 85.5},
            }
        )

        resp = await handle_webhook(hass, webhook_id, request)

        assert resp.status == 200


class TestWebhookInvalidJson:
    """Verify that unparseable bodies return 400."""

    @pytest.mark.asyncio
    async def test_invalid_json_returns_400(self, make_hass_with_entry, webhook_id):
        hass, _ = make_hass_with_entry()
        request = FakeRequest(raise_on_json=ValueError("bad json"))

        resp = await handle_webhook(hass, webhook_id, request)

        assert resp.status == 400
        assert "Invalid JSON" in resp.text

    @pytest.mark.asyncio
    async def test_json_decode_error_returns_400(self, make_hass_with_entry, webhook_id):
        hass, _ = make_hass_with_entry()
        request = FakeRequest(raise_on_json=json.JSONDecodeError("msg", "doc", 0))

        resp = await handle_webhook(hass, webhook_id, request)

        assert resp.status == 400
        assert "Invalid JSON" in resp.text


class TestWebhookUnknownMessageType:
    """Verify that unrecognised 'type' values return 400."""

    @pytest.mark.asyncio
    async def test_unknown_type_returns_400(self, make_hass_with_entry, webhook_id):
        hass, _ = make_hass_with_entry()
        request = FakeRequest(body={"type": "firmware_update"})

        resp = await handle_webhook(hass, webhook_id, request)

        assert resp.status == 400
        assert "Unknown type" in resp.text

    @pytest.mark.asyncio
    async def test_missing_type_returns_400(self, make_hass_with_entry, webhook_id):
        hass, _ = make_hass_with_entry()
        request = FakeRequest(body={"sensors": {"steps": 1}})

        resp = await handle_webhook(hass, webhook_id, request)

        assert resp.status == 400
        assert "Unknown type" in resp.text


class TestWebhookMissingRequiredFields:
    """Verify that payloads with missing or invalid required fields return 422."""

    @pytest.mark.asyncio
    async def test_empty_sensors_dict_returns_422(self, make_hass_with_entry, webhook_id):
        hass, _ = make_hass_with_entry()
        request = FakeRequest(
            body={"type": "sensor_update", "device_id": "x", "sensors": {}}
        )

        resp = await handle_webhook(hass, webhook_id, request)

        assert resp.status == 422
        assert "No sensor data" in resp.text

    @pytest.mark.asyncio
    async def test_device_id_too_long_returns_422(self, make_hass_with_entry, webhook_id):
        hass, _ = make_hass_with_entry()
        long_id = "a" * (MAX_DEVICE_ID_LEN + 1)
        request = FakeRequest(
            body={
                "type": "sensor_update",
                "device_id": long_id,
                "sensors": {"steps": 1},
            }
        )

        resp = await handle_webhook(hass, webhook_id, request)

        assert resp.status == 422
        assert "Invalid device_id" in resp.text

    @pytest.mark.asyncio
    async def test_device_id_non_string_returns_422(self, make_hass_with_entry, webhook_id):
        hass, _ = make_hass_with_entry()
        request = FakeRequest(
            body={
                "type": "sensor_update",
                "device_id": 12345,
                "sensors": {"steps": 1},
            }
        )

        resp = await handle_webhook(hass, webhook_id, request)

        assert resp.status == 422
        assert "Invalid device_id" in resp.text

    @pytest.mark.asyncio
    async def test_sensors_not_a_dict_returns_422(self, make_hass_with_entry, webhook_id):
        hass, _ = make_hass_with_entry()
        request = FakeRequest(
            body={
                "type": "sensor_update",
                "device_id": "x",
                "sensors": [1, 2, 3],
            }
        )

        resp = await handle_webhook(hass, webhook_id, request)

        assert resp.status == 422
        assert "Invalid sensors" in resp.text

    @pytest.mark.asyncio
    async def test_too_many_sensors_returns_422(self, make_hass_with_entry, webhook_id):
        hass, _ = make_hass_with_entry()
        sensors = {f"sensor_{i}": i for i in range(MAX_SENSORS + 1)}
        request = FakeRequest(
            body={
                "type": "sensor_update",
                "device_id": "x",
                "sensors": sensors,
            }
        )

        resp = await handle_webhook(hass, webhook_id, request)

        assert resp.status == 422
        assert "Invalid sensors" in resp.text

    @pytest.mark.asyncio
    async def test_non_numeric_sensor_values_coerced_to_none(
        self, make_hass_with_entry, webhook_id
    ):
        """String sensor values are silently replaced with None, but if all
        become None the payload still has keys so it should succeed."""
        hass, coordinator = make_hass_with_entry()
        request = FakeRequest(
            body={
                "type": "sensor_update",
                "device_id": "x",
                "sensors": {"steps": "abc", "heart_rate": 72},
            }
        )

        resp = await handle_webhook(hass, webhook_id, request)

        # One valid sensor remains so this should succeed.
        assert resp.status == 200

    @pytest.mark.asyncio
    async def test_all_non_numeric_sensors_still_passes_if_keys_remain(
        self, make_hass_with_entry, webhook_id
    ):
        """When all values are coerced to None the dict still has keys,
        so the webhook should succeed (values become None)."""
        hass, coordinator = make_hass_with_entry()
        request = FakeRequest(
            body={
                "type": "sensor_update",
                "device_id": "x",
                "sensors": {"steps": "bad", "hr": "also_bad"},
            }
        )

        resp = await handle_webhook(hass, webhook_id, request)

        # Keys remain even though values were coerced to None
        assert resp.status == 200


class TestWebhookNonDictPayload:
    """Verify that non-dict top-level JSON returns 400."""

    @pytest.mark.asyncio
    async def test_list_payload_returns_400(self, make_hass_with_entry, webhook_id):
        hass, _ = make_hass_with_entry()
        request = FakeRequest(body=[1, 2, 3])

        resp = await handle_webhook(hass, webhook_id, request)

        assert resp.status == 400
        assert "Expected JSON object" in resp.text

    @pytest.mark.asyncio
    async def test_string_payload_returns_400(self, make_hass_with_entry, webhook_id):
        hass, _ = make_hass_with_entry()
        request = FakeRequest(raw='"not a dict"')

        resp = await handle_webhook(hass, webhook_id, request)

        assert resp.status == 400
        assert "Expected JSON object" in resp.text

    @pytest.mark.asyncio
    async def test_integer_payload_returns_400(self, make_hass_with_entry, webhook_id):
        hass, _ = make_hass_with_entry()
        request = FakeRequest(body=42)

        resp = await handle_webhook(hass, webhook_id, request)

        assert resp.status == 400
        assert "Expected JSON object" in resp.text

    @pytest.mark.asyncio
    async def test_null_payload_returns_400(self, make_hass_with_entry, webhook_id):
        hass, _ = make_hass_with_entry()
        request = FakeRequest(raw="null")

        resp = await handle_webhook(hass, webhook_id, request)

        assert resp.status == 400
        assert "Expected JSON object" in resp.text


class TestWebhookMissingConfigEntry:
    """Verify behaviour when no config entry matches the webhook ID."""

    @pytest.mark.asyncio
    async def test_unknown_webhook_returns_404(self, hass):
        hass.data["infinassistant"] = {}
        request = FakeRequest(
            body={
                "type": "sensor_update",
                "device_id": "x",
                "sensors": {"steps": 1},
            }
        )

        resp = await handle_webhook(hass, "nonexistent_webhook", request)

        assert resp.status == 404
        assert "Webhook not configured" in resp.text


# =============================================================================
# 2. SERVICE SCHEMA VALIDATION TESTS
# =============================================================================


class TestSendNotificationSchema:
    """Tests for SEND_NOTIFICATION_SCHEMA."""

    def test_valid_notification(self):
        result = SEND_NOTIFICATION_SCHEMA(
            {"title": "Test", "message": "Hello", "severity": "info"}
        )
        assert result["title"] == "Test"
        assert result["message"] == "Hello"
        assert result["severity"] == "info"

    def test_severity_defaults_to_info(self):
        result = SEND_NOTIFICATION_SCHEMA({"title": "T", "message": "M"})
        assert result["severity"] == "info"

    def test_all_severity_levels_accepted(self):
        for sev in ("info", "warn", "critical"):
            result = SEND_NOTIFICATION_SCHEMA(
                {"title": "T", "message": "M", "severity": sev}
            )
            assert result["severity"] == sev

    def test_missing_title_raises(self):
        with pytest.raises(vol.MultipleInvalid):
            SEND_NOTIFICATION_SCHEMA({"message": "Hello"})

    def test_missing_message_raises(self):
        with pytest.raises(vol.MultipleInvalid):
            SEND_NOTIFICATION_SCHEMA({"title": "Hello"})

    def test_invalid_severity_raises(self):
        with pytest.raises(vol.MultipleInvalid):
            SEND_NOTIFICATION_SCHEMA(
                {"title": "T", "message": "M", "severity": "debug"}
            )

    def test_optional_device_id_accepted(self):
        result = SEND_NOTIFICATION_SCHEMA(
            {"title": "T", "message": "M", "device_id": "abc"}
        )
        assert result["device_id"] == "abc"

    def test_empty_strings_accepted(self):
        """Empty string is a valid voluptuous string; business logic may reject later."""
        result = SEND_NOTIFICATION_SCHEMA({"title": "", "message": ""})
        assert result["title"] == ""


class TestTriggerVibrationSchema:
    """Tests for TRIGGER_VIBRATION_SCHEMA."""

    def test_defaults_applied(self):
        result = TRIGGER_VIBRATION_SCHEMA({})
        assert result["duration_ms"] == 500
        assert result["pattern"] == "short"

    def test_valid_custom_values(self):
        result = TRIGGER_VIBRATION_SCHEMA(
            {"duration_ms": 2000, "pattern": "double"}
        )
        assert result["duration_ms"] == 2000
        assert result["pattern"] == "double"

    def test_duration_below_min_raises(self):
        with pytest.raises(vol.MultipleInvalid):
            TRIGGER_VIBRATION_SCHEMA({"duration_ms": 50})

    def test_duration_above_max_raises(self):
        with pytest.raises(vol.MultipleInvalid):
            TRIGGER_VIBRATION_SCHEMA({"duration_ms": 6000})

    def test_duration_at_min_boundary(self):
        result = TRIGGER_VIBRATION_SCHEMA({"duration_ms": 100})
        assert result["duration_ms"] == 100

    def test_duration_at_max_boundary(self):
        result = TRIGGER_VIBRATION_SCHEMA({"duration_ms": 5000})
        assert result["duration_ms"] == 5000

    def test_invalid_pattern_raises(self):
        with pytest.raises(vol.MultipleInvalid):
            TRIGGER_VIBRATION_SCHEMA({"pattern": "buzz"})

    def test_all_valid_patterns(self):
        for pat in ("short", "long", "double", "triple"):
            result = TRIGGER_VIBRATION_SCHEMA({"pattern": pat})
            assert result["pattern"] == pat

    def test_duration_string_coerced_to_int(self):
        result = TRIGGER_VIBRATION_SCHEMA({"duration_ms": "1000"})
        assert result["duration_ms"] == 1000
        assert isinstance(result["duration_ms"], int)


class TestSetAlarmSchema:
    """Tests for SET_ALARM_SCHEMA."""

    def test_valid_alarm(self):
        result = SET_ALARM_SCHEMA({"hour": 7, "minute": 30})
        assert result["hour"] == 7
        assert result["minute"] == 30
        assert result["enabled"] is True
        assert result["days"] == []

    def test_full_alarm(self):
        result = SET_ALARM_SCHEMA(
            {
                "hour": 23,
                "minute": 59,
                "enabled": False,
                "days": ["mon", "wed", "fri"],
            }
        )
        assert result["hour"] == 23
        assert result["minute"] == 59
        assert result["enabled"] is False
        assert result["days"] == ["mon", "wed", "fri"]

    def test_hour_below_range_raises(self):
        with pytest.raises(vol.MultipleInvalid):
            SET_ALARM_SCHEMA({"hour": -1, "minute": 0})

    def test_hour_above_range_raises(self):
        with pytest.raises(vol.MultipleInvalid):
            SET_ALARM_SCHEMA({"hour": 24, "minute": 0})

    def test_minute_below_range_raises(self):
        with pytest.raises(vol.MultipleInvalid):
            SET_ALARM_SCHEMA({"hour": 0, "minute": -1})

    def test_minute_above_range_raises(self):
        with pytest.raises(vol.MultipleInvalid):
            SET_ALARM_SCHEMA({"hour": 0, "minute": 60})

    def test_missing_hour_raises(self):
        with pytest.raises(vol.MultipleInvalid):
            SET_ALARM_SCHEMA({"minute": 0})

    def test_missing_minute_raises(self):
        with pytest.raises(vol.MultipleInvalid):
            SET_ALARM_SCHEMA({"hour": 0})

    def test_invalid_day_raises(self):
        with pytest.raises(vol.MultipleInvalid):
            SET_ALARM_SCHEMA({"hour": 0, "minute": 0, "days": ["monday"]})

    def test_hour_boundary_values(self):
        for h in (0, 23):
            result = SET_ALARM_SCHEMA({"hour": h, "minute": 0})
            assert result["hour"] == h

    def test_minute_boundary_values(self):
        for m in (0, 59):
            result = SET_ALARM_SCHEMA({"hour": 0, "minute": m})
            assert result["minute"] == m

    def test_all_valid_days(self):
        all_days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
        result = SET_ALARM_SCHEMA({"hour": 8, "minute": 0, "days": all_days})
        assert result["days"] == all_days


class TestPushWatchfaceLayoutSchema:
    """Tests for PUSH_WATCHFACE_LAYOUT_SCHEMA."""

    def _valid_v1_layout(self) -> dict:
        return {
            "device_id": "dev1",
            "layout": {
                "version": 1,
                "theme": {"bg": "#000"},
                "header": {"show_clock": True},
                "tiles": [{"entity_id": "light.desk"}],
                "actions": [{"label": "Toggle"}],
            },
        }

    def _valid_v2_layout(self) -> dict:
        return {
            "device_id": "dev1",
            "layout": {
                "version": 2,
                "theme": {"bg": "#000"},
                "header": {"show_clock": True},
                "screens": [{"type": 1, "tiles": []}],
            },
        }

    def test_valid_v1_layout_passes(self):
        result = PUSH_WATCHFACE_LAYOUT_SCHEMA(self._valid_v1_layout())
        assert result["layout"]["version"] == 1

    def test_valid_v2_layout_passes(self):
        result = PUSH_WATCHFACE_LAYOUT_SCHEMA(self._valid_v2_layout())
        assert result["layout"]["version"] == 2

    def test_missing_device_id_raises(self):
        data = self._valid_v1_layout()
        del data["device_id"]
        with pytest.raises(vol.MultipleInvalid):
            PUSH_WATCHFACE_LAYOUT_SCHEMA(data)

    def test_missing_layout_version_raises(self):
        data = self._valid_v1_layout()
        del data["layout"]["version"]
        with pytest.raises(vol.MultipleInvalid):
            PUSH_WATCHFACE_LAYOUT_SCHEMA(data)

    def test_missing_theme_raises(self):
        data = self._valid_v1_layout()
        del data["layout"]["theme"]
        with pytest.raises(vol.MultipleInvalid):
            PUSH_WATCHFACE_LAYOUT_SCHEMA(data)

    def test_missing_header_raises(self):
        data = self._valid_v1_layout()
        del data["layout"]["header"]
        with pytest.raises(vol.MultipleInvalid):
            PUSH_WATCHFACE_LAYOUT_SCHEMA(data)

    def test_extra_layout_field_raises_prevent_extra(self):
        data = self._valid_v1_layout()
        data["layout"]["unknownField"] = "surprise"
        with pytest.raises(vol.MultipleInvalid) as exc_info:
            PUSH_WATCHFACE_LAYOUT_SCHEMA(data)
        assert "extra keys" in str(exc_info.value).lower() or "not allowed" in str(
            exc_info.value
        ).lower()

    def test_version_coerced_from_string(self):
        data = self._valid_v1_layout()
        data["layout"]["version"] = "2"
        result = PUSH_WATCHFACE_LAYOUT_SCHEMA(data)
        assert result["layout"]["version"] == 2
        assert isinstance(result["layout"]["version"], int)

    def test_layout_with_optional_statusbar(self):
        data = self._valid_v1_layout()
        data["layout"]["statusBar"] = {"show": True}
        result = PUSH_WATCHFACE_LAYOUT_SCHEMA(data)
        assert result["layout"]["statusBar"] == {"show": True}

    def test_layout_with_optional_events(self):
        data = self._valid_v1_layout()
        data["layout"]["events"] = {"onTap": "toggle"}
        result = PUSH_WATCHFACE_LAYOUT_SCHEMA(data)
        assert result["layout"]["events"] == {"onTap": "toggle"}


class TestGetWatchfaceSchema:
    """Tests for GET_WATCHFACE_SCHEMA."""

    def test_valid_request(self):
        result = GET_WATCHFACE_SCHEMA({"device_id": "my_device"})
        assert result["device_id"] == "my_device"

    def test_missing_device_id_raises(self):
        with pytest.raises(vol.MultipleInvalid):
            GET_WATCHFACE_SCHEMA({})


# =============================================================================
# 3. CONFIG FLOW TESTS
# =============================================================================


class TestConfigFlowUserStep:
    """Tests for InfinassistantConfigFlow.async_step_user."""

    @pytest.mark.asyncio
    async def test_user_step_shows_form_when_no_input(self):
        flow = InfinassistantConfigFlow()
        result = await flow.async_step_user(user_input=None)

        assert result["type"] == "form"
        assert result["step_id"] == "user"

    @pytest.mark.asyncio
    async def test_user_step_advances_to_confirm_on_valid_input(self):
        flow = InfinassistantConfigFlow()
        flow._hass = MagicMock()
        flow.context = {}

        result = await flow.async_step_user(
            user_input={CONF_DEVICE_ID: "my_pinetime"}
        )

        # After user step with valid input, it proceeds to confirm_setup step.
        # The result is either a form (confirm_setup) or create_entry.
        assert result["type"] == "form"
        assert result["step_id"] == "confirm_setup"
        assert flow.context["device_id"] == "my_pinetime"
        assert "webhook_id" in flow.context
        # Webhook ID should be a 32-character hex string (uuid4.hex)
        assert len(flow.context["webhook_id"]) == 32

    @pytest.mark.asyncio
    async def test_confirm_step_creates_entry(self):
        flow = InfinassistantConfigFlow()
        flow._hass = MagicMock()
        flow.context = {
            "device_id": "my_pinetime",
            "webhook_id": "abc123def456",
            "webhook_url": "http://ha.local:8123/api/webhook/abc123def456",
            "hmac_secret": _fake_secret("test_secret_base64_urlsafe"),
        }

        result = await flow.async_step_confirm_setup(user_input={})

        assert result["type"] == "create_entry"
        assert result["title"] == "PineTime (my_pinetime)"
        assert result["data"][CONF_DEVICE_ID] == "my_pinetime"
        assert result["data"][CONF_WEBHOOK_ID] == "abc123def456"

    @pytest.mark.asyncio
    async def test_confirm_step_shows_form_when_no_input(self):
        flow = InfinassistantConfigFlow()
        flow.context = {
            "device_id": "my_pinetime",
            "webhook_id": "abc123def456",
            "webhook_url": "http://ha.local:8123/api/webhook/abc123def456",
            "hmac_secret": _fake_secret("test_secret_base64_urlsafe"),
        }

        result = await flow.async_step_confirm_setup(user_input=None)

        assert result["type"] == "form"
        assert result["step_id"] == "confirm_setup"


class TestConfigFlowZeroconfStep:
    """Tests for InfinassistantConfigFlow.async_step_zeroconf."""

    @pytest.mark.asyncio
    async def test_zeroconf_missing_webhook_url_aborts(self):
        flow = InfinassistantConfigFlow()
        flow.context = {}

        discovery = MagicMock()
        discovery.properties = {}

        result = await flow.async_step_zeroconf(discovery)

        assert result["type"] == "abort"
        assert result["reason"] == "no_webhook_url"

    @pytest.mark.asyncio
    async def test_zeroconf_invalid_webhook_url_aborts(self):
        flow = InfinassistantConfigFlow()
        flow.context = {}

        discovery = MagicMock()
        discovery.properties = {"webhook_url": "http://ha.local/bad/path"}

        result = await flow.async_step_zeroconf(discovery)

        assert result["type"] == "abort"
        assert result["reason"] == "invalid_webhook_url"

    @pytest.mark.asyncio
    async def test_zeroconf_valid_discovery_advances_to_confirm(self):
        flow = InfinassistantConfigFlow()
        flow.context = {}

        discovery = MagicMock()
        discovery.properties = {
            "webhook_url": "http://ha.local:8123/api/webhook/wh123",
            "device_id": "pine01",
        }

        result = await flow.async_step_zeroconf(discovery)

        assert result["type"] == "form"
        assert result["step_id"] == "confirm_discovery"
        assert flow.context["webhook_id"] == "wh123"
        assert flow.context["device_id"] == "pine01"

    @pytest.mark.asyncio
    async def test_zeroconf_fallback_device_id_to_webhook_id(self):
        flow = InfinassistantConfigFlow()
        flow.context = {}

        discovery = MagicMock()
        discovery.properties = {
            "webhook_url": "http://ha.local:8123/api/webhook/wh456",
            # No device_id property
        }

        result = await flow.async_step_zeroconf(discovery)

        assert flow.context["device_id"] == "wh456"


class TestConfigFlowConfirmDiscovery:
    """Tests for the confirm_discovery step."""

    @pytest.mark.asyncio
    async def test_confirm_discovery_routes_to_handshake(self):
        """REQ-045: confirm_discovery no longer creates the entry directly —
        it advances to the QR/manual-secret handshake step. Entry creation
        happens only after the operator acks that the bridge received the
        secret. See TestZeroconfHandshakeFlow in test_phase_e.py for the
        create_entry side."""
        flow = InfinassistantConfigFlow()
        flow.context = {
            "device_id": "pine01",
            "webhook_id": "wh123",
            "webhook_url": "http://ha.local:8123/api/webhook/wh123",
        }

        result = await flow.async_step_confirm_discovery(user_input={})

        assert result["type"] == "form"
        assert result["step_id"] == "confirm_discovery_handshake"

    @pytest.mark.asyncio
    async def test_confirm_discovery_shows_form_when_no_input(self):
        flow = InfinassistantConfigFlow()
        flow.context = {
            "device_id": "pine01",
            "webhook_id": "wh123",
            "webhook_url": "http://ha.local:8123/api/webhook/wh123",
        }

        result = await flow.async_step_confirm_discovery(user_input=None)

        assert result["type"] == "form"
        assert result["step_id"] == "confirm_discovery"


class TestOptionsFlow:
    """The options flow: webhook info, settings and key rotation.

    conftest's OptionsFlow is Home Assistant 2025.12's: ``config_entry`` is a
    property with no setter, and reading it raises until the flow manager has
    set the flow's handler. The flow keeps the entry it is given as ``_entry``
    instead, which also works from 2024.1 (hacs.json's minimum), before the
    property existed.
    """

    OLD_SECRET = _fake_secret("old_secret_for_the_test")

    def _flow(self, hass, options=None):
        entry = ConfigEntry(
            data={
                CONF_DEVICE_ID: "aabbccddeeff",
                CONF_WEBHOOK_ID: "wh_abc",
                CONF_HMAC_SECRET: self.OLD_SECRET,
            },
            entry_id="entry_1",
            options=options,
        )
        flow = InfinassistantConfigFlow.async_get_options_flow(entry)
        # As the flow manager does. handler stays unset, so a read of
        # flow.config_entry would raise.
        flow.hass = hass
        return flow, entry

    def test_building_the_flow_does_not_assign_config_entry(self):
        # Assigning it raises AttributeError from Home Assistant 2025.12.
        assert InfinassistantOptionsFlow.config_entry.fset is None
        entry = ConfigEntry(data={CONF_DEVICE_ID: "aabbccddeeff"})

        flow = InfinassistantConfigFlow.async_get_options_flow(entry)

        assert isinstance(flow, InfinassistantOptionsFlow)
        assert flow._entry is entry

    async def test_the_form_shows_the_entry_and_its_options(self, hass):
        flow, _ = self._flow(hass, options={CONF_RATE_LIMIT: 45})

        result = await flow.async_step_init()

        assert result["type"] == "form"
        assert result["step_id"] == "init"
        placeholders = result["description_placeholders"]
        assert placeholders["device_id"] == "aabbccddeeff"
        assert placeholders["webhook_id"] == "wh_abc"
        assert placeholders["webhook_url"].endswith("/api/webhook/wh_abc")
        defaults = {str(key): key.default() for key in result["data_schema"].schema}
        assert defaults[CONF_RATE_LIMIT] == 45

    async def test_saving_stores_the_settings(self, hass):
        flow, _ = self._flow(hass)

        result = await flow.async_step_init(
            user_input={CONF_RATE_LIMIT: 90, CONF_REPLAY_WINDOW: 120}
        )

        assert result["type"] == "create_entry"
        assert result["data"][CONF_RATE_LIMIT] == 90
        assert result["data"][CONF_REPLAY_WINDOW] == 120

    async def test_rotating_the_key_updates_and_reloads_the_entry_it_was_given(self, hass):
        hass.config_entries.async_reload = AsyncMock()
        flow, entry = self._flow(hass)

        result = await flow.async_step_rotate_key(user_input={"confirm_rotate": True})

        assert result["type"] == "form"
        assert result["step_id"] == "rotate_key_done"
        update = hass.config_entries.async_update_entry
        update.assert_called_once()
        assert update.call_args.args == (entry,)
        new_data = update.call_args.kwargs["data"]
        assert new_data[CONF_HMAC_OLD_SECRET] == self.OLD_SECRET
        assert new_data[CONF_HMAC_SECRET] not in (None, self.OLD_SECRET)
        assert result["description_placeholders"]["new_secret"] == new_data[CONF_HMAC_SECRET]
        hass.config_entries.async_reload.assert_awaited_once_with("entry_1")

    async def test_finishing_the_rotation_keeps_the_options(self, hass):
        flow, _ = self._flow(hass, options={CONF_RATE_LIMIT: 45})

        result = await flow.async_step_rotate_key_done(user_input={})

        assert result == {"type": "create_entry", "title": "", "data": {CONF_RATE_LIMIT: 45}}


# =============================================================================
# 4. EDGE CASE / INTEGRATION-STYLE TESTS
# =============================================================================


class TestWebhookCoordinatorError:
    """Verify that coordinator exceptions are handled gracefully."""

    @pytest.mark.asyncio
    async def test_coordinator_exception_returns_500(self, make_hass_with_entry, webhook_id):
        hass, coordinator = make_hass_with_entry()
        coordinator.update_from_webhook = AsyncMock(
            side_effect=RuntimeError("coordinator boom")
        )
        request = FakeRequest(
            body={
                "type": "sensor_update",
                "device_id": "x",
                "sensors": {"steps": 1},
            }
        )

        resp = await handle_webhook(hass, webhook_id, request)

        assert resp.status == 500
        assert "Internal error" in resp.text


class TestWebhookTimestamp:
    """Verify that timestamp field is passed through to the coordinator."""

    @pytest.mark.asyncio
    async def test_timestamp_forwarded_to_coordinator(
        self, make_hass_with_entry, webhook_id
    ):
        hass, coordinator = make_hass_with_entry()
        request = FakeRequest(
            body={
                "type": "sensor_update",
                "device_id": "x",
                "timestamp": 1700000000000,
                "sensors": {"steps": 100},
            }
        )

        resp = await handle_webhook(hass, webhook_id, request)

        assert resp.status == 200
        call_args = coordinator.update_from_webhook.call_args
        sensor_data = call_args[0][0]
        assert sensor_data["timestamp"] == 1700000000000

    @pytest.mark.asyncio
    async def test_missing_timestamp_still_succeeds(
        self, make_hass_with_entry, webhook_id
    ):
        hass, coordinator = make_hass_with_entry()
        request = FakeRequest(
            body={
                "type": "sensor_update",
                "device_id": "x",
                "sensors": {"steps": 100},
            }
        )

        resp = await handle_webhook(hass, webhook_id, request)

        assert resp.status == 200
        call_args = coordinator.update_from_webhook.call_args
        sensor_data = call_args[0][0]
        assert "timestamp" not in sensor_data


# =============================================================================
# 5. SCHEMA PREVENT_EXTRA TESTS
# =============================================================================


class TestSchemaPreventExtra:
    """Verify that all top-level service schemas reject extra fields."""

    def test_send_notification_rejects_extra_field(self):
        with pytest.raises(vol.MultipleInvalid):
            SEND_NOTIFICATION_SCHEMA(
                {"title": "T", "message": "M", "unknown_field": "x"}
            )

    def test_trigger_vibration_rejects_extra_field(self):
        with pytest.raises(vol.MultipleInvalid):
            TRIGGER_VIBRATION_SCHEMA({"extra_key": "val"})

    def test_set_alarm_rejects_extra_field(self):
        with pytest.raises(vol.MultipleInvalid):
            SET_ALARM_SCHEMA({"hour": 8, "minute": 0, "unknown": True})

    def test_push_watchface_layout_rejects_extra_top_level_field(self):
        with pytest.raises(vol.MultipleInvalid):
            PUSH_WATCHFACE_LAYOUT_SCHEMA({
                "device_id": "dev1",
                "layout": {
                    "version": 1,
                    "theme": {},
                    "header": {},
                    "tiles": [],
                    "actions": [],
                },
                "surprise": "bad",
            })

    def test_get_watchface_rejects_extra_field(self):
        with pytest.raises(vol.MultipleInvalid):
            GET_WATCHFACE_SCHEMA({"device_id": "dev1", "extra": True})


# =============================================================================
# 6. COORDINATOR TESTS
# =============================================================================


class TestCoordinatorWebhookUpdate:
    """Tests for InfinassistantDataCoordinator.update_from_webhook."""

    @pytest.fixture
    def coordinator(self, hass):
        """Create a real coordinator instance for testing."""
        return InfinassistantDataCoordinator(hass, "test_device_01")

    @pytest.mark.asyncio
    async def test_update_maps_steps(self, coordinator):
        await coordinator.update_from_webhook({"steps": 5000})
        assert coordinator.data["steps"] == 5000

    @pytest.mark.asyncio
    async def test_update_maps_heart_rate(self, coordinator):
        await coordinator.update_from_webhook({"heart_rate": 72})
        assert coordinator.data["heart_rate"] == 72

    @pytest.mark.asyncio
    async def test_update_maps_battery_percent_to_battery(self, coordinator):
        """Webhook sends 'battery_percent', coordinator stores as 'battery'."""
        await coordinator.update_from_webhook({"battery_percent": 85})
        assert coordinator.data["battery"] == 85

    @pytest.mark.asyncio
    async def test_update_maps_battery_charging(self, coordinator):
        await coordinator.update_from_webhook({"battery_charging": True})
        assert coordinator.data["battery_charging"] is True

    @pytest.mark.asyncio
    async def test_update_maps_motion_state(self, coordinator):
        await coordinator.update_from_webhook({"motion_state": "walking"})
        assert coordinator.data["motion_state"] == "walking"

    @pytest.mark.asyncio
    async def test_update_sets_last_sync_from_timestamp(self, coordinator):
        """When timestamp is provided, last_sync is derived from it."""
        await coordinator.update_from_webhook(
            {"steps": 1, "timestamp": 1700000000000}
        )
        assert coordinator.data["last_sync"] is not None

    @pytest.mark.asyncio
    async def test_update_sets_last_sync_when_no_timestamp(self, coordinator):
        """When no timestamp, last_sync defaults to utcnow()."""
        await coordinator.update_from_webhook({"steps": 1})
        assert coordinator.data["last_sync"] is not None

    @pytest.mark.asyncio
    async def test_partial_update_preserves_existing_data(self, coordinator):
        """Updating one field should not clear another."""
        await coordinator.update_from_webhook({"steps": 100})
        await coordinator.update_from_webhook({"heart_rate": 60})
        assert coordinator.data["steps"] == 100
        assert coordinator.data["heart_rate"] == 60

    @pytest.mark.asyncio
    async def test_update_overwrites_previous_value(self, coordinator):
        """A second update for the same key should overwrite."""
        await coordinator.update_from_webhook({"steps": 100})
        await coordinator.update_from_webhook({"steps": 200})
        assert coordinator.data["steps"] == 200


class TestCoordinatorConcurrentWebhook:
    """Tests for concurrent webhook update safety."""

    @pytest.fixture
    def coordinator(self, hass):
        return InfinassistantDataCoordinator(hass, "test_device_01")

    @pytest.mark.asyncio
    async def test_concurrent_updates_both_applied(self, coordinator):
        """Two concurrent webhook updates should both be applied without data loss."""
        # Simulate two concurrent updates
        await asyncio.gather(
            coordinator.update_from_webhook({"steps": 5000}),
            coordinator.update_from_webhook({"heart_rate": 80}),
        )
        # Both fields should be present (order may vary but both applied)
        assert coordinator.data["steps"] == 5000
        assert coordinator.data["heart_rate"] == 80

    @pytest.mark.asyncio
    async def test_lock_exists(self, coordinator):
        """Coordinator should have an asyncio.Lock for update serialization."""
        assert hasattr(coordinator, "_update_lock")
        assert isinstance(coordinator._update_lock, asyncio.Lock)


class TestCoordinatorWatchfaceLayout:
    """Tests for watchface layout storage in coordinator."""

    @pytest.fixture
    def coordinator(self, hass):
        return InfinassistantDataCoordinator(hass, "test_device_01")

    @pytest.mark.asyncio
    async def test_set_and_get_watchface_layout(self, coordinator):
        layout = {"version": 2, "screens": []}
        await coordinator.set_watchface_layout("test_device_01", layout)
        result = coordinator.get_watchface_layout("test_device_01")
        assert result == layout

    @pytest.mark.asyncio
    async def test_get_layout_returns_none_initially(self, coordinator):
        result = coordinator.get_watchface_layout("test_device_01")
        assert result is None

    @pytest.mark.asyncio
    async def test_set_layout_wrong_device_id_ignored(self, coordinator):
        layout = {"version": 1}
        await coordinator.set_watchface_layout("wrong_device", layout)
        result = coordinator.get_watchface_layout("test_device_01")
        assert result is None

    @pytest.mark.asyncio
    async def test_get_layout_wrong_device_id_returns_none(self, coordinator):
        layout = {"version": 1}
        await coordinator.set_watchface_layout("test_device_01", layout)
        result = coordinator.get_watchface_layout("wrong_device")
        assert result is None


class TestCoordinatorFirstRefresh:
    """Tests for coordinator initial data setup."""

    @pytest.fixture
    def coordinator(self, hass):
        return InfinassistantDataCoordinator(hass, "test_device_01")

    @pytest.mark.asyncio
    async def test_first_refresh_sets_last_sync(self, coordinator):
        """After first refresh, last_sync should be set so sensors become available."""
        await coordinator.async_config_entry_first_refresh()
        assert coordinator.data["last_sync"] is not None

    @pytest.mark.asyncio
    async def test_initial_sensor_values_are_none(self, coordinator):
        """Before any webhook update, sensor values should be None."""
        await coordinator.async_config_entry_first_refresh()
        assert coordinator.data["steps"] is None
        assert coordinator.data["heart_rate"] is None
        assert coordinator.data["battery"] is None


# =============================================================================
# 7. SENSOR ENTITY TESTS
# =============================================================================


class TestSensorEntity:
    """Tests for InfinassistantSensor entity."""

    @pytest.fixture
    def coordinator(self, hass):
        coord = InfinassistantDataCoordinator(hass, "test_device_01")
        coord.last_update_success = True
        return coord

    @pytest.fixture
    def entry(self):
        from tests.conftest import _FakeConfigEntry
        return _FakeConfigEntry(
            data={CONF_DEVICE_ID: "test_device_01", CONF_WEBHOOK_ID: "wh_test"},
            entry_id="test_entry",
        )

    def test_sensor_available_after_sync(self, coordinator, entry):
        """Sensor should be available after coordinator has synced."""
        from custom_components.infinassistant.sensor import InfinassistantSensor
        coordinator.data = {
            "steps": 1234,
            "last_sync": "2024-01-01T00:00:00Z",
        }
        sensor = InfinassistantSensor(
            coordinator, entry, "test_device_01", "steps",
            "http://ha.local/api/webhook/wh_test",
        )
        assert sensor.available is True

    def test_sensor_unavailable_without_sync(self, coordinator, entry):
        """Sensor should be unavailable before first sync."""
        from custom_components.infinassistant.sensor import InfinassistantSensor
        coordinator.data = {
            "steps": None,
            "last_sync": None,
        }
        sensor = InfinassistantSensor(
            coordinator, entry, "test_device_01", "steps",
            "http://ha.local/api/webhook/wh_test",
        )
        assert sensor.available is False

    def test_sensor_returns_native_value(self, coordinator, entry):
        """Sensor should return the correct value from coordinator data."""
        from custom_components.infinassistant.sensor import InfinassistantSensor
        coordinator.data = {
            "steps": 9999,
            "last_sync": "2024-01-01T00:00:00Z",
        }
        sensor = InfinassistantSensor(
            coordinator, entry, "test_device_01", "steps",
            "http://ha.local/api/webhook/wh_test",
        )
        assert sensor.native_value == 9999

    def test_sensor_returns_none_when_no_data(self, coordinator, entry):
        """Sensor should return None when coordinator has no data."""
        from custom_components.infinassistant.sensor import InfinassistantSensor
        coordinator.data = None
        sensor = InfinassistantSensor(
            coordinator, entry, "test_device_01", "steps",
            "http://ha.local/api/webhook/wh_test",
        )
        assert sensor.native_value is None

    def test_sensor_unique_id(self, coordinator, entry):
        """Sensor should have a unique ID based on device and type."""
        from custom_components.infinassistant.sensor import InfinassistantSensor
        sensor = InfinassistantSensor(
            coordinator, entry, "test_device_01", "heart_rate",
            "http://ha.local/api/webhook/wh_test",
        )
        assert sensor._attr_unique_id == "test_device_01_heart_rate"

    def test_sensor_device_info(self, coordinator, entry):
        """Sensor should report correct device info."""
        from custom_components.infinassistant.sensor import InfinassistantSensor
        sensor = InfinassistantSensor(
            coordinator, entry, "test_device_01", "battery",
            "http://ha.local/api/webhook/wh_test",
        )
        info = sensor.device_info
        assert (DOMAIN, "test_device_01") in info["identifiers"]
        assert info["manufacturer"] == "Pine64"
        assert info["model"] == "PineTime"


# =============================================================================
# 8. BINARY SENSOR ENTITY TESTS
# =============================================================================


class TestBinarySensorEntity:
    """Tests for InfinassistantBinarySensor entity."""

    @pytest.fixture
    def coordinator(self, hass):
        coord = InfinassistantDataCoordinator(hass, "test_device_01")
        coord.last_update_success = True
        return coord

    @pytest.fixture
    def entry(self):
        from tests.conftest import _FakeConfigEntry
        return _FakeConfigEntry(
            data={CONF_DEVICE_ID: "test_device_01", CONF_WEBHOOK_ID: "wh_test"},
            entry_id="test_entry",
        )

    def test_binary_sensor_is_on_true(self, coordinator, entry):
        """Binary sensor should return True when data is True."""
        from custom_components.infinassistant.binary_sensor import (
            InfinassistantBinarySensor, BINARY_SENSOR_CONFIGS,
        )
        coordinator.data = {
            "battery_charging": True,
            "last_sync": "2024-01-01T00:00:00Z",
        }
        sensor = InfinassistantBinarySensor(
            coordinator, entry, "test_device_01",
            "battery_charging", BINARY_SENSOR_CONFIGS["battery_charging"],
        )
        assert sensor.is_on is True

    def test_binary_sensor_is_on_false(self, coordinator, entry):
        """Binary sensor should return False when data is False."""
        from custom_components.infinassistant.binary_sensor import (
            InfinassistantBinarySensor, BINARY_SENSOR_CONFIGS,
        )
        coordinator.data = {
            "connected": False,
            "last_sync": "2024-01-01T00:00:00Z",
        }
        sensor = InfinassistantBinarySensor(
            coordinator, entry, "test_device_01",
            "connected", BINARY_SENSOR_CONFIGS["connected"],
        )
        assert sensor.is_on is False

    def test_binary_sensor_is_on_none_when_no_data(self, coordinator, entry):
        """Binary sensor should return None when coordinator has no data."""
        from custom_components.infinassistant.binary_sensor import (
            InfinassistantBinarySensor, BINARY_SENSOR_CONFIGS,
        )
        coordinator.data = None
        sensor = InfinassistantBinarySensor(
            coordinator, entry, "test_device_01",
            "connected", BINARY_SENSOR_CONFIGS["connected"],
        )
        assert sensor.is_on is None

    def test_binary_sensor_available_after_sync(self, coordinator, entry):
        """Binary sensor should be available after coordinator has synced."""
        from custom_components.infinassistant.binary_sensor import (
            InfinassistantBinarySensor, BINARY_SENSOR_CONFIGS,
        )
        coordinator.data = {
            "connected": True,
            "last_sync": "2024-01-01T00:00:00Z",
        }
        sensor = InfinassistantBinarySensor(
            coordinator, entry, "test_device_01",
            "connected", BINARY_SENSOR_CONFIGS["connected"],
        )
        assert sensor.available is True

    def test_binary_sensor_unavailable_without_sync(self, coordinator, entry):
        """Binary sensor should be unavailable before first sync."""
        from custom_components.infinassistant.binary_sensor import (
            InfinassistantBinarySensor, BINARY_SENSOR_CONFIGS,
        )
        coordinator.data = {
            "connected": None,
            "last_sync": None,
        }
        sensor = InfinassistantBinarySensor(
            coordinator, entry, "test_device_01",
            "connected", BINARY_SENSOR_CONFIGS["connected"],
        )
        assert sensor.available is False

    def test_binary_sensor_unique_id(self, coordinator, entry):
        """Binary sensor should have a unique ID based on device and type."""
        from custom_components.infinassistant.binary_sensor import (
            InfinassistantBinarySensor, BINARY_SENSOR_CONFIGS,
        )
        sensor = InfinassistantBinarySensor(
            coordinator, entry, "test_device_01",
            "battery_charging", BINARY_SENSOR_CONFIGS["battery_charging"],
        )
        assert sensor._attr_unique_id == "test_device_01_battery_charging"

    def test_binary_sensor_device_info(self, coordinator, entry):
        """Binary sensor should report correct device info."""
        from custom_components.infinassistant.binary_sensor import (
            InfinassistantBinarySensor, BINARY_SENSOR_CONFIGS,
        )
        sensor = InfinassistantBinarySensor(
            coordinator, entry, "test_device_01",
            "connected", BINARY_SENSOR_CONFIGS["connected"],
        )
        info = sensor.device_info
        assert (DOMAIN, "test_device_01") in info["identifiers"]
        assert info["manufacturer"] == "Pine64"

    def test_binary_sensor_device_class(self, coordinator, entry):
        """Binary sensor should have the correct device class."""
        from custom_components.infinassistant.binary_sensor import (
            InfinassistantBinarySensor, BINARY_SENSOR_CONFIGS,
        )
        sensor = InfinassistantBinarySensor(
            coordinator, entry, "test_device_01",
            "connected", BINARY_SENSOR_CONFIGS["connected"],
        )
        assert sensor._attr_device_class == "connectivity"


# =============================================================================
# 9. SERVICE RESOLVE COORDINATOR TESTS
# =============================================================================


class TestResolveCoordinator:
    """Tests for _resolve_coordinator device resolution logic."""

    @pytest.mark.asyncio
    async def test_resolve_single_device_without_device_id(self, hass):
        """When only one device is configured and no device_id given, return it."""
        from custom_components.infinassistant.services import _resolve_coordinator

        coordinator_mock = MagicMock()
        coordinator_mock.device_id = "pine01"
        hass.data[DOMAIN] = {
            "entry_1": {
                "coordinator": coordinator_mock,
                "device_id": "pine01",
            }
        }

        coord, dev_id = await _resolve_coordinator(hass, None)
        assert coord is coordinator_mock
        assert dev_id == "pine01"

    @pytest.mark.asyncio
    async def test_resolve_raises_on_multiple_devices_without_id(self, hass):
        """When multiple devices and no device_id given, raise error."""
        from custom_components.infinassistant.services import _resolve_coordinator
        from homeassistant.exceptions import ServiceValidationError

        hass.data[DOMAIN] = {
            "entry_1": {"coordinator": MagicMock(), "device_id": "pine01"},
            "entry_2": {"coordinator": MagicMock(), "device_id": "pine02"},
        }

        with pytest.raises(ServiceValidationError, match="Multiple devices"):
            await _resolve_coordinator(hass, None)

    @pytest.mark.asyncio
    async def test_resolve_raises_on_no_devices(self, hass):
        """When no devices configured and no device_id given, raise error."""
        from custom_components.infinassistant.services import _resolve_coordinator
        from homeassistant.exceptions import ServiceValidationError

        hass.data[DOMAIN] = {}

        with pytest.raises(ServiceValidationError, match="No InfinAssistant devices"):
            await _resolve_coordinator(hass, None)

    @pytest.mark.asyncio
    async def test_resolve_by_custom_device_id(self, hass):
        """Resolve by custom device_id (backward compat)."""
        from custom_components.infinassistant.services import _resolve_coordinator
        from homeassistant.helpers import device_registry as dr

        coordinator_mock = MagicMock()
        hass.data[DOMAIN] = {
            "entry_1": {
                "coordinator": coordinator_mock,
                "device_id": "pine01",
            }
        }
        # HA device registry returns None (not found by registry ID)
        dr.async_get.return_value.async_get.return_value = None

        coord, dev_id = await _resolve_coordinator(hass, "pine01")
        assert coord is coordinator_mock
        assert dev_id == "pine01"

    @pytest.mark.asyncio
    async def test_resolve_raw_mac_to_entry_stored_normalized(self, hass):
        """A card/app sending the raw MAC reaches the entry stored as the normalized id."""
        from custom_components.infinassistant.services import _resolve_coordinator
        from homeassistant.helpers import device_registry as dr

        coordinator_mock = MagicMock()
        hass.data[DOMAIN] = {
            "entry_1": {"coordinator": coordinator_mock, "device_id": "aabbccddeeff"},
        }
        dr.async_get.return_value.async_get.return_value = None

        for sent in ("AA:BB:CC:DD:EE:FF", "aa-bb-cc-dd-ee-ff", " aabbccddeeff "):
            coord, dev_id = await _resolve_coordinator(hass, sent)
            assert coord is coordinator_mock
            assert dev_id == "aabbccddeeff"

    @pytest.mark.asyncio
    async def test_resolve_normalized_id_to_entry_stored_raw(self, hass):
        """An entry that still stores a raw MAC resolves from the normalized form."""
        from custom_components.infinassistant.services import _resolve_coordinator
        from homeassistant.helpers import device_registry as dr

        coordinator_mock = MagicMock()
        hass.data[DOMAIN] = {
            "entry_1": {"coordinator": coordinator_mock, "device_id": "AA:BB:CC:DD:EE:FF"},
        }
        dr.async_get.return_value.async_get.return_value = None

        coord, dev_id = await _resolve_coordinator(hass, "aabbccddeeff")
        assert coord is coordinator_mock
        assert dev_id == "AA:BB:CC:DD:EE:FF"

    @pytest.mark.asyncio
    async def test_resolve_other_mac_does_not_match(self, hass):
        """A different MAC still raises, so normalization does not widen the match."""
        from custom_components.infinassistant.services import _resolve_coordinator
        from homeassistant.exceptions import ServiceValidationError
        from homeassistant.helpers import device_registry as dr

        hass.data[DOMAIN] = {
            "entry_1": {"coordinator": MagicMock(), "device_id": "aabbccddeeff"},
        }
        dr.async_get.return_value.async_get.return_value = None

        with pytest.raises(ServiceValidationError, match="Device not found"):
            await _resolve_coordinator(hass, "AA:BB:CC:DD:EE:00")

    @pytest.mark.asyncio
    async def test_resolve_blank_device_id_does_not_match_blank_entry(self, hass):
        """A blank id must not match an entry whose stored id is also blank."""
        from custom_components.infinassistant.services import _resolve_coordinator
        from homeassistant.exceptions import ServiceValidationError
        from homeassistant.helpers import device_registry as dr

        hass.data[DOMAIN] = {"entry_1": {"coordinator": MagicMock(), "device_id": ""}}
        dr.async_get.return_value.async_get.return_value = None

        with pytest.raises(ServiceValidationError, match="Device not found"):
            await _resolve_coordinator(hass, "   ")

    @pytest.mark.asyncio
    async def test_resolve_raises_on_unknown_device_id(self, hass):
        """Raise ServiceValidationError when device_id not found."""
        from custom_components.infinassistant.services import _resolve_coordinator
        from homeassistant.exceptions import ServiceValidationError
        from homeassistant.helpers import device_registry as dr

        hass.data[DOMAIN] = {
            "entry_1": {"coordinator": MagicMock(), "device_id": "pine01"},
        }
        dr.async_get.return_value.async_get.return_value = None

        with pytest.raises(ServiceValidationError, match="Device not found"):
            await _resolve_coordinator(hass, "nonexistent")


# =============================================================================
# 10. SETUP TESTS
# =============================================================================


def _on_the_event_loop() -> bool:
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return False
    return True


class TestSetupResidualStorageScan:
    """async_setup warns about the .storage/ files of the old "infinissistant"
    spelling. It lists the directory in the executor: on the event loop that is
    a blocking call, which Home Assistant 2024.6 and later report."""

    @pytest.fixture
    def setup_hass(self, hass, tmp_path):
        """hass whose executor jobs run in a worker thread, as Home Assistant's do."""
        hass.config.path = lambda *parts: str(tmp_path.joinpath(*parts))
        hass.config.components = set()  # no frontend, so the card is not served

        async def run_in_executor(func, *args):
            return await asyncio.get_running_loop().run_in_executor(None, func, *args)

        hass.async_add_executor_job = AsyncMock(side_effect=run_in_executor)
        return hass

    @pytest.fixture
    def storage(self, tmp_path, monkeypatch):
        """tmp_path/.storage, which may be looked at only off the event loop."""
        storage = tmp_path / ".storage"

        def off_the_loop(real):
            def call(*args, **kwargs):
                path = args[0] if args else kwargs.get("path", ".")
                if os.fspath(path) == str(storage) and _on_the_event_loop():
                    raise AssertionError(f"{real.__name__}({path!r}) ran on the event loop")
                return real(*args, **kwargs)

            return call

        monkeypatch.setattr(os, "listdir", off_the_loop(os.listdir))
        monkeypatch.setattr(os.path, "isdir", off_the_loop(os.path.isdir))
        return storage

    async def test_warns_about_each_residual_file(self, setup_hass, storage, caplog):
        storage.mkdir()
        (storage / "infinissistant.watchface_layout").write_text("{}", encoding="utf-8")
        (storage / "core.config_entries").write_text("{}", encoding="utf-8")

        with caplog.at_level(logging.WARNING, logger="custom_components.infinassistant"):
            assert await async_setup(setup_hass, {}) is True

        setup_hass.async_add_executor_job.assert_any_await(_residual_storage_files, str(storage))
        assert "infinissistant.watchface_layout" in caplog.text
        assert "core.config_entries" not in caplog.text

    async def test_no_storage_directory_no_warning(self, setup_hass, storage, caplog):
        with caplog.at_level(logging.WARNING, logger="custom_components.infinassistant"):
            assert await async_setup(setup_hass, {}) is True

        assert "residual" not in caplog.text

    def test_the_scan_finds_only_the_old_spelling(self, tmp_path):
        storage = tmp_path / ".storage"
        assert _residual_storage_files(str(storage)) == []

        storage.mkdir()
        for name in ("infinissistant.layout", "core.config_entries", "infinassistant.layout"):
            (storage / name).write_text("{}", encoding="utf-8")

        assert _residual_storage_files(str(storage)) == ["infinissistant.layout"]
