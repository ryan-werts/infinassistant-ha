"""Text-state webhook sensors (motion_state, heart_rate_state) and numeric-only everything else."""
from __future__ import annotations

import logging

import pytest

from custom_components.infinassistant import handle_webhook
from custom_components.infinassistant.const import MAX_TEXT_SENSOR_LEN, TEXT_SENSOR_KEYS
from tests.conftest import FakeRequest


async def _post(make_hass_with_entry, webhook_id, sensors):
    hass, coordinator = make_hass_with_entry()
    request = FakeRequest(
        body={"type": "sensor_update", "device_id": "pinetime_01", "sensors": sensors}
    )
    resp = await handle_webhook(hass, webhook_id, request)
    return resp, coordinator


def _forwarded(coordinator) -> dict:
    return coordinator.update_from_webhook.await_args.args[0]


def test_text_keys_are_the_ones_the_app_sends():
    assert TEXT_SENSOR_KEYS == {"motion_state", "heart_rate_state"}


class TestTextValueAccepted:
    @pytest.mark.parametrize(
        "key,value",
        [
            ("motion_state", "active"),
            ("motion_state", "inactive"),
            ("heart_rate_state", "stopped"),
            ("heart_rate_state", "not_enough_data"),
            ("heart_rate_state", "no_touch"),
            ("heart_rate_state", "running"),
            ("heart_rate_state", "unknown"),
            ("motion_state", "x" * MAX_TEXT_SENSOR_LEN),
        ],
    )
    async def test_allowed_key_keeps_text(self, make_hass_with_entry, webhook_id, key, value):
        resp, coordinator = await _post(make_hass_with_entry, webhook_id, {key: value})

        assert resp.status == 200
        assert _forwarded(coordinator)[key] == value

    async def test_full_app_payload_reaches_the_coordinator(self, make_hass_with_entry, webhook_id):
        sensors = {
            "steps": 8432,
            "heart_rate": 72,
            "heart_rate_state": "running",
            "battery_percent": 85,
            "battery_charging": False,
            "motion_state": "active",
        }
        resp, coordinator = await _post(make_hass_with_entry, webhook_id, dict(sensors))

        assert resp.status == 200
        forwarded = _forwarded(coordinator)
        for key, value in sensors.items():
            assert forwarded[key] == value


class TestTextValueRejected:
    @pytest.mark.parametrize(
        "value",
        [
            "x" * (MAX_TEXT_SENSOR_LEN + 1),
            "",
            "bad\nvalue",
            "tab\there",
            "nul\x00byte",
        ],
    )
    async def test_bad_string_for_allowed_key_is_dropped(
        self, make_hass_with_entry, webhook_id, value
    ):
        resp, coordinator = await _post(
            make_hass_with_entry, webhook_id, {"motion_state": value, "steps": 10}
        )

        assert resp.status == 200
        forwarded = _forwarded(coordinator)
        assert forwarded["motion_state"] is None
        assert forwarded["steps"] == 10

    @pytest.mark.parametrize("value", [["a"], {"a": 1}])
    async def test_non_string_non_number_for_allowed_key_is_dropped(
        self, make_hass_with_entry, webhook_id, value
    ):
        resp, coordinator = await _post(
            make_hass_with_entry, webhook_id, {"heart_rate_state": value, "steps": 10}
        )

        assert resp.status == 200
        assert _forwarded(coordinator)["heart_rate_state"] is None

    @pytest.mark.parametrize("key", ["steps", "heart_rate", "battery_percent", "mystery_key"])
    async def test_text_for_other_key_is_dropped(self, make_hass_with_entry, webhook_id, key):
        resp, coordinator = await _post(
            make_hass_with_entry, webhook_id, {key: "active", "motion_state": "active"}
        )

        assert resp.status == 200
        forwarded = _forwarded(coordinator)
        assert forwarded[key] is None
        assert forwarded["motion_state"] == "active"


class TestNumericKeysUnchanged:
    async def test_numeric_values_pass(self, make_hass_with_entry, webhook_id):
        resp, coordinator = await _post(
            make_hass_with_entry,
            webhook_id,
            {"steps": 1234, "heart_rate": 72, "battery_percent": 85.5},
        )

        assert resp.status == 200
        forwarded = _forwarded(coordinator)
        assert forwarded["steps"] == 1234
        assert forwarded["heart_rate"] == 72
        assert forwarded["battery_percent"] == 85.5

    async def test_null_passes(self, make_hass_with_entry, webhook_id):
        resp, coordinator = await _post(
            make_hass_with_entry, webhook_id, {"heart_rate": None, "steps": 5}
        )

        assert resp.status == 200
        assert _forwarded(coordinator)["heart_rate"] is None

    async def test_out_of_range_still_discarded(self, make_hass_with_entry, webhook_id):
        resp, coordinator = await _post(
            make_hass_with_entry,
            webhook_id,
            {"heart_rate": 999, "motion_state": "active"},
        )

        assert resp.status == 200
        forwarded = _forwarded(coordinator)
        assert forwarded["heart_rate"] is None
        assert forwarded["motion_state"] == "active"

    @pytest.mark.parametrize("zero", [0, 0.0])
    async def test_heart_rate_zero_is_no_reading(
        self, make_hass_with_entry, webhook_id, caplog, zero
    ):
        with caplog.at_level(logging.WARNING):
            resp, coordinator = await _post(
                make_hass_with_entry, webhook_id, {"heart_rate": zero, "steps": 10}
            )

        assert resp.status == 200
        forwarded = _forwarded(coordinator)
        assert forwarded["heart_rate"] is None
        assert forwarded["steps"] == 10
        assert "Out-of-range" not in caplog.text
        coordinator.increment_range_violation.assert_not_called()

    @pytest.mark.parametrize("value", [-1, 14, 261])
    async def test_heart_rate_out_of_range_still_warns(
        self, make_hass_with_entry, webhook_id, caplog, value
    ):
        with caplog.at_level(logging.WARNING):
            resp, coordinator = await _post(
                make_hass_with_entry, webhook_id, {"heart_rate": value, "steps": 10}
            )

        assert resp.status == 200
        assert _forwarded(coordinator)["heart_rate"] is None
        assert "Out-of-range" in caplog.text
        coordinator.increment_range_violation.assert_called_once_with("heart_rate")

    async def test_zero_is_a_real_value_for_steps(self, make_hass_with_entry, webhook_id):
        resp, coordinator = await _post(make_hass_with_entry, webhook_id, {"steps": 0})

        assert resp.status == 200
        assert _forwarded(coordinator)["steps"] == 0

    async def test_numeric_value_for_text_key_is_not_rewritten(
        self, make_hass_with_entry, webhook_id
    ):
        resp, coordinator = await _post(make_hass_with_entry, webhook_id, {"motion_state": 3})

        assert resp.status == 200
        assert _forwarded(coordinator)["motion_state"] == 3


class TestCoordinatorExposesTextState:
    async def test_coordinator_stores_both_text_states(self, hass):
        from custom_components.infinassistant.coordinator import InfinassistantDataCoordinator

        coordinator = InfinassistantDataCoordinator(hass, "test_device_01")
        assert coordinator.data["heart_rate_state"] is None

        await coordinator.update_from_webhook(
            {"motion_state": "active", "heart_rate_state": "no_touch"}
        )

        assert coordinator.data["motion_state"] == "active"
        assert coordinator.data["heart_rate_state"] == "no_touch"

    def test_sensor_entity_reports_text_state(self, hass):
        from custom_components.infinassistant.const import CONF_DEVICE_ID, CONF_WEBHOOK_ID, SENSOR_TYPES
        from custom_components.infinassistant.coordinator import InfinassistantDataCoordinator
        from custom_components.infinassistant.sensor import InfinassistantSensor
        from tests.conftest import _FakeConfigEntry

        assert "heart_rate_state" in SENSOR_TYPES
        coordinator = InfinassistantDataCoordinator(hass, "test_device_01")
        coordinator.data = {"heart_rate_state": "running", "last_sync": "2024-01-01T00:00:00Z"}
        entry = _FakeConfigEntry(
            data={CONF_DEVICE_ID: "test_device_01", CONF_WEBHOOK_ID: "wh_test"}, entry_id="e"
        )

        sensor = InfinassistantSensor(
            coordinator, entry, "test_device_01", "heart_rate_state", "http://ha.local/api/webhook/wh_test"
        )

        assert sensor.native_value == "running"
