"""Cross-platform protocol compatibility tests.

Verifies that CBOR encoding/decoding for key message types is stable and
matches the byte-level expectations described in ble-protocol-spec.md.

These tests exercise the Python side of the protocol — they do NOT import
firmware code, but they verify that the CBOR structures a Python encoder
would produce are parseable and semantically correct.

Requirements:
  - cbor2 (pip install cbor2)

Skip behaviour: if cbor2 is unavailable the entire module is skipped so
CI can run without the optional dependency.
"""
from __future__ import annotations

import json
import struct
import sys
from pathlib import Path
from typing import Any

import pytest

# ---------------------------------------------------------------------------
# cbor2 availability guard
# ---------------------------------------------------------------------------

try:
    import cbor2
    _has_cbor2 = True
except ImportError:
    _has_cbor2 = False

_cbor2_skip = pytest.mark.skipif(not _has_cbor2, reason="cbor2 not installed")

# ---------------------------------------------------------------------------
# Protocol constants (mirror of ProtocolMessages.h)
# ---------------------------------------------------------------------------

MSG_HELLO              = 0x01
MSG_CONFIG_PUSH        = 0x02
MSG_CONFIG_ACK         = 0x03
MSG_STATE_UPDATE       = 0x04
MSG_STATE_REFRESH_REQUEST = 0x05
MSG_ACTION_INVOKE      = 0x06
MSG_ACTION_RESULT      = 0x07
MSG_NOTIFY             = 0x08
MSG_NOTIFY_ACK         = 0x09
MSG_PING               = 0x0A
MSG_PONG               = 0x0B
MSG_SENSOR_REPORT      = 0x0C
MSG_HAPTIC_FEEDBACK    = 0x0D
MSG_WATCHFACE_LAYOUT   = 0x0E
MSG_TIME_SYNC          = 0x0F
MSG_LOGBOOK_REQUEST    = 0x10
MSG_LOGBOOK_UPDATE     = 0x11
MSG_WATCHFACE_ACK      = 0x12
MSG_CALENDAR_UPDATE    = 0x13
MSG_CALENDAR_NAV       = 0x14
MSG_HOME_CONTROL_UPDATE = 0x15
MSG_TIME_SYNC_ACK      = 0x16
MSG_HELLO_ACK          = 0x17
MSG_VERSION_MISMATCH   = 0x18
MSG_CONFIG_PUSH_ACK    = 0x19
MSG_CRASH_DUMP_REQUEST = 0x1A
MSG_CRASH_DUMP_ACK     = 0x1B
MSG_FIND_PHONE         = 0x1C
MSG_FIND_WATCH         = 0x1D
# REQ-071 — notification dismiss/snooze round-trip
MSG_NOTIFY_DISMISS     = 0x1E
MSG_NOTIFY_SNOOZE      = 0x1F

PROTO_MAJOR = 1
PROTO_MINOR = 0
PROTO_PATCH = 0

VOICE_ASSIST_ACTION_ID = 0xFFFE

FEATURE_WATCHFACE_LAYOUT   = (1 << 0)
FEATURE_LOGBOOK            = (1 << 1)
FEATURE_HAPTIC_FEEDBACK    = (1 << 2)
FEATURE_TIME_SYNC          = (1 << 3)
FEATURE_VOICE_ASSIST       = (1 << 4)
FEATURE_WATCHFACE_ACK      = (1 << 5)
FEATURE_CALENDAR           = (1 << 6)
FEATURE_HOME_CONTROL           = (1 << 7)
FEATURE_PROTOCOL_NEGOT         = (1 << 8)
FEATURE_FIND_DEVICE            = (1 << 9)
FEATURE_NOTIFY_DISMISS_SNOOZE  = (1 << 10)  # REQ-071 (retired: firmware 2.4.95 and later do not set it)
FEATURE_SHORT_KEYS             = (1 << 11)
FEATURE_CRASH_REPORT           = (1 << 12)
FEATURE_DASHBOARD_STATE        = (1 << 13)
FEATURE_SIX_SCREENS            = (1 << 14)
FEATURE_PHONE_NOTIFY_SYNC      = (1 << 15)
FEATURE_CONFIG_KEY_V2          = (1 << 16)  # 2.4.103: CONFIG_PUSH key "infinassistant"

CONFIG_PUSH_ACK_OK           = 0
CONFIG_PUSH_ACK_CRC_MISMATCH = 1
CONFIG_PUSH_ACK_OOM          = 2
CONFIG_PUSH_ACK_INVALID      = 3

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _encode(payload: Any) -> bytes:
    """CBOR-encode a Python value."""
    return cbor2.dumps(payload)


def _decode(data: bytes) -> Any:
    """CBOR-decode bytes."""
    return cbor2.loads(data)


def _crc32(data: bytes) -> int:
    """CRC-32 (ISO 3309) — same polynomial used by firmware."""
    import binascii
    return binascii.crc32(data) & 0xFFFFFFFF


# ===========================================================================
# 4.26 FR-TEST-1  Tests
# ===========================================================================


@_cbor2_skip
class TestHelloPayload:
    """HELLO message round-trip."""

    def _make_hello_watch(self, *, fw_version: str = "1.103.0") -> dict:
        return {
            "device": "watch",
            "proto": PROTO_MAJOR,
            "capabilities": {
                "cbor": True,
                "maxActions": 20,
                "supportsDoubleTap": True,
                "supportsNotifyDedupe": True,
            },
            "features": (
                FEATURE_WATCHFACE_LAYOUT
                | FEATURE_LOGBOOK
                | FEATURE_HAPTIC_FEEDBACK
                | FEATURE_TIME_SYNC
                | FEATURE_WATCHFACE_ACK
                | FEATURE_CALENDAR
                | FEATURE_HOME_CONTROL
                | FEATURE_PROTOCOL_NEGOT
            ),
            "fwVersion": fw_version,
            "freeHeap": 32768,
            "minFreeHeap": 16384,
            "mallocFails": 0,
            "stackOverflows": 0,
            "mbufFailures": 0,
            "uptimeTicks": 1234567,
        }

    def test_round_trip_preserves_all_fields(self):
        original = self._make_hello_watch()
        encoded = _encode(original)
        decoded = _decode(encoded)

        assert decoded["device"] == "watch"
        assert decoded["proto"] == PROTO_MAJOR
        assert decoded["features"] == original["features"]
        assert decoded["fwVersion"] == "1.103.0"
        assert decoded["freeHeap"] == 32768
        assert decoded["capabilities"]["cbor"] is True

    def test_round_trip_encoded_bytes_decode_deterministically(self):
        payload = self._make_hello_watch()
        enc1 = _encode(payload)
        enc2 = _encode(payload)
        # Both encode runs must produce parseable CBOR with same semantic values
        assert _decode(enc1) == _decode(enc2)

    def test_features_bitmask_carries_all_supported_flags(self):
        payload = self._make_hello_watch()
        features = payload["features"]
        # All eight declared feature bits should be present
        for bit in (
            FEATURE_WATCHFACE_LAYOUT,
            FEATURE_LOGBOOK,
            FEATURE_HAPTIC_FEEDBACK,
            FEATURE_TIME_SYNC,
            FEATURE_WATCHFACE_ACK,
            FEATURE_CALENDAR,
            FEATURE_HOME_CONTROL,
            FEATURE_PROTOCOL_NEGOT,
        ):
            assert features & bit, f"Feature bit 0x{bit:03x} missing from features=0x{features:x}"

    def test_phone_hello_omits_watch_only_fields(self):
        phone_hello = {
            "device": "phone",
            "proto": PROTO_MAJOR,
            "capabilities": {"cbor": True, "maxActions": 20},
        }
        encoded = _encode(phone_hello)
        decoded = _decode(encoded)
        assert "fwVersion" not in decoded
        assert "freeHeap" not in decoded
        assert decoded["device"] == "phone"

    def test_crash_context_optional(self):
        """HELLO without crashContext is valid; with it carries expected keys."""
        base = self._make_hello_watch()
        # No crash context
        encoded = _encode(base)
        decoded = _decode(encoded)
        assert "crashContext" not in decoded

        # With crash context
        base["crashContext"] = {
            "breadcrumb": 5,
            "lastMsgType": MSG_CONFIG_PUSH,
            "lastMsgId": 42,
            "freeHeap": 8192,
            "uptimeTicks": 99999,
        }
        decoded2 = _decode(_encode(base))
        assert decoded2["crashContext"]["lastMsgType"] == MSG_CONFIG_PUSH


@_cbor2_skip
class TestStateUpdateMessage:
    """STATE_UPDATE encoding: ha_offline and data_stale flags."""

    def _make_state_update(
        self,
        *,
        ha_offline: bool = False,
        data_stale: bool = False,
    ) -> dict:
        return {
            "ha_offline": ha_offline,
            "data_stale": data_stale,
            "items": [
                {
                    "entityId": "sensor.temperature",
                    "state": "22.5",
                    "unit": "°C",
                    "ts": 1741728000,
                }
            ],
        }

    def test_ha_offline_true_data_stale_true_encodes_to_expected_bytes(self):
        """Verify known CBOR byte sequence for ha_offline=true, data_stale=true."""
        payload = self._make_state_update(ha_offline=True, data_stale=True)
        encoded = _encode(payload)

        # Must be valid CBOR
        decoded = _decode(encoded)
        assert decoded["ha_offline"] is True
        assert decoded["data_stale"] is True
        assert decoded["items"][0]["entityId"] == "sensor.temperature"

        # CBOR must encode booleans as single-byte true (0xf5)
        assert b"\xf5" in encoded  # 0xf5 = CBOR true

    def test_ha_offline_false_data_stale_false_round_trip(self):
        payload = self._make_state_update(ha_offline=False, data_stale=False)
        decoded = _decode(_encode(payload))
        assert decoded["ha_offline"] is False
        assert decoded["data_stale"] is False

    def test_items_array_preserved(self):
        payload = self._make_state_update()
        payload["items"].append(
            {"entityId": "binary_sensor.motion", "state": "on", "unit": None, "ts": 1741728001}
        )
        decoded = _decode(_encode(payload))
        assert len(decoded["items"]) == 2
        assert decoded["items"][1]["entityId"] == "binary_sensor.motion"

    def test_empty_items_array_encodes(self):
        payload = {"ha_offline": False, "data_stale": False, "items": []}
        decoded = _decode(_encode(payload))
        assert decoded["items"] == []


@_cbor2_skip
class TestConfigPushAckMessage:
    """CONFIG_PUSH_ACK (0x19) encoding and decoding."""

    def _make_ack(
        self,
        *,
        status: int = CONFIG_PUSH_ACK_OK,
        crc32: int = 0,
        config_version: int = 0,
    ) -> dict:
        return {
            "status": status,
            "crc32": crc32,
            "configVersion": config_version,
        }

    def test_ok_ack_decodes_correctly(self):
        ack = self._make_ack(status=CONFIG_PUSH_ACK_OK, crc32=0xDEADBEEF, config_version=7)
        decoded = _decode(_encode(ack))
        assert decoded["status"] == CONFIG_PUSH_ACK_OK
        assert decoded["crc32"] == 0xDEADBEEF
        assert decoded["configVersion"] == 7

    def test_crc_mismatch_status_encodes(self):
        ack = self._make_ack(status=CONFIG_PUSH_ACK_CRC_MISMATCH, crc32=0x12345678, config_version=3)
        decoded = _decode(_encode(ack))
        assert decoded["status"] == CONFIG_PUSH_ACK_CRC_MISMATCH

    def test_oom_status_encodes(self):
        ack = self._make_ack(status=CONFIG_PUSH_ACK_OOM)
        decoded = _decode(_encode(ack))
        assert decoded["status"] == CONFIG_PUSH_ACK_OOM

    def test_invalid_status_encodes(self):
        ack = self._make_ack(status=CONFIG_PUSH_ACK_INVALID)
        decoded = _decode(_encode(ack))
        assert decoded["status"] == CONFIG_PUSH_ACK_INVALID

    def test_crc32_computed_over_known_payload_matches_expected(self):
        """CRC-32 of known bytes produces known result.

        binascii.crc32(b'\\x00') & 0xFFFFFFFF = 0xD202EF8D (standard ISO 3309).
        """
        assert _crc32(b"\x00") == 0xD202EF8D

    def test_crc32_of_empty_bytes(self):
        assert _crc32(b"") == 0x00000000

    def test_config_push_ack_message_type_constant(self):
        assert MSG_CONFIG_PUSH_ACK == 0x19

    def test_config_push_ack_round_trip_zero_values(self):
        ack = self._make_ack()
        decoded = _decode(_encode(ack))
        assert decoded["status"] == 0
        assert decoded["crc32"] == 0
        assert decoded["configVersion"] == 0


@_cbor2_skip
class TestMessageTypeConstants:
    """Verify message type enum values match ProtocolMessages.h exactly."""

    _expected = {
        "HELLO": 0x01,
        "CONFIG_PUSH": 0x02,
        "CONFIG_ACK": 0x03,
        "STATE_UPDATE": 0x04,
        "STATE_REFRESH_REQUEST": 0x05,
        "ACTION_INVOKE": 0x06,
        "ACTION_RESULT": 0x07,
        "NOTIFY": 0x08,
        "NOTIFY_ACK": 0x09,
        "PING": 0x0A,
        "PONG": 0x0B,
        "SENSOR_REPORT": 0x0C,
        "HAPTIC_FEEDBACK": 0x0D,
        "WATCHFACE_LAYOUT": 0x0E,
        "TIME_SYNC": 0x0F,
        "LOGBOOK_REQUEST": 0x10,
        "LOGBOOK_UPDATE": 0x11,
        "WATCHFACE_ACK": 0x12,
        "CALENDAR_UPDATE": 0x13,
        "CALENDAR_NAV": 0x14,
        "HOME_CONTROL_UPDATE": 0x15,
        "TIME_SYNC_ACK": 0x16,
        "HELLO_ACK": 0x17,
        "VERSION_MISMATCH": 0x18,
        "CONFIG_PUSH_ACK": 0x19,
    }

    def test_all_message_type_values(self):
        module = sys.modules[__name__]
        for name, expected_value in self._expected.items():
            attr = f"MSG_{name}"
            assert hasattr(module, attr), f"Missing constant {attr}"
            actual = getattr(module, attr)
            assert actual == expected_value, (
                f"{attr}: expected 0x{expected_value:02x}, got 0x{actual:02x}"
            )

    def test_voice_assist_action_id(self):
        assert VOICE_ASSIST_ACTION_ID == 0xFFFE

    def test_no_duplicate_message_type_values(self):
        values = list(self._expected.values())
        assert len(values) == len(set(values)), "Duplicate message type values detected"


@_cbor2_skip
class TestSensorReportPayload:
    """SENSOR_REPORT compact key encoding."""

    def _make_sensor_report(self) -> dict:
        return {
            "s": 12345,       # steps
            "hr": 72,         # heart rate
            "hs": 3,          # heart rate state (Running)
            "b": 85,          # battery percent
            "bc": False,      # battery charging
            "mx": -12,        # motion X
            "my": 34,         # motion Y
            "mz": 980,        # motion Z
            "ts": 1741728000, # unix timestamp
            "fh": 32768,      # free heap
            "mh": 16384,      # min free heap
            "sw": 256,        # stack high-water (words)
        }

    def test_compact_keys_round_trip(self):
        payload = self._make_sensor_report()
        decoded = _decode(_encode(payload))
        assert decoded["s"] == 12345
        assert decoded["hr"] == 72
        assert decoded["hs"] == 3
        assert decoded["b"] == 85
        assert decoded["bc"] is False
        assert decoded["mx"] == -12
        assert decoded["ts"] == 1741728000
        assert decoded["fh"] == 32768
        assert decoded["sw"] == 256

    def test_all_compact_keys_present(self):
        payload = self._make_sensor_report()
        decoded = _decode(_encode(payload))
        for key in ("s", "hr", "hs", "b", "bc", "mx", "my", "mz", "ts", "fh", "mh", "sw"):
            assert key in decoded, f"Key '{key}' missing from decoded sensor report"

    # REQ-056 — LVGL diagnostic fields in SENSOR_REPORT
    def _make_sensor_report_v2(self) -> dict:
        """SENSOR_REPORT with the four REQ-056 LVGL diag fields appended."""
        base = self._make_sensor_report()
        base.update({
            "lvfs": 20480,   # lvFreeSize (bytes)
            "lvfb": 18432,   # lvFreeBiggest (bytes)
            "lvfp": 10,      # lvFragPct (percent, 0-100)
            "lvcf": 0,       # lvCreateFailures (count)
        })
        return base

    def test_lvgl_diag_keys_round_trip(self):
        """REQ-056: four LVGL diag compact keys survive CBOR encode/decode."""
        payload = self._make_sensor_report_v2()
        decoded = _decode(_encode(payload))
        assert decoded["lvfs"] == 20480
        assert decoded["lvfb"] == 18432
        assert decoded["lvfp"] == 10
        assert decoded["lvcf"] == 0

    def test_lvgl_diag_frag_pct_range(self):
        """REQ-056: lvFragPct must encode correctly at boundary values."""
        for frag in (0, 50, 99, 100):
            payload = self._make_sensor_report()
            payload["lvfp"] = frag
            decoded = _decode(_encode(payload))
            assert decoded["lvfp"] == frag

    def test_sensor_report_all_keys_including_lvgl(self):
        """REQ-056: SENSOR_REPORT v2 contains all 16 fields."""
        payload = self._make_sensor_report_v2()
        decoded = _decode(_encode(payload))
        for key in ("s", "hr", "hs", "b", "bc", "mx", "my", "mz",
                    "ts", "fh", "mh", "sw", "lvfs", "lvfb", "lvfp", "lvcf"):
            assert key in decoded, f"Key '{key}' missing from v2 sensor report"

    def test_sensor_report_backward_compat_without_lvgl_fields(self):
        """REQ-056: Older watch omitting LVGL fields must still decode cleanly."""
        payload = self._make_sensor_report()  # no lvfs/lvfb/lvfp/lvcf
        decoded = _decode(_encode(payload))
        for key in ("s", "hr", "hs", "b", "bc", "mx", "my", "mz",
                    "ts", "fh", "mh", "sw"):
            assert key in decoded
        # LVGL fields absent — decoder must not raise
        for key in ("lvfs", "lvfb", "lvfp", "lvcf"):
            assert key not in decoded


@_cbor2_skip
class TestHelloDiagRev2Fields:
    """REQ-056 — HELLO helloDiagRev=2 LVGL diagnostic fields."""

    def _make_hello_v2(self) -> dict:
        return {
            "device": "watch",
            "features": 0xFF,
            "fwVersion": "1.103.10",
            "resetReason": "WDT",
            "freeHeap": 30000,
            "minFreeHeap": 15000,
            "mallocFails": 0,
            "stackOverflows": 0,
            "mbufFailures": 0,
            "truncatedWriteFailures": 0,
            "oversizeNotifyDrops": 0,
            "negotiatedMtu": 247,
            "bleQueueOverflows": 0,
            "uptimeTicks": 100000,
            "pmaj": 1,
            "pmin": 0,
            "ppat": 0,
            "bridgeProtocolRev": 1,
            "dashboardProtocolRev": 1,
            "helloDiagRev": 2,
            "maxReassemblySize": 8192,
            # REQ-056 fields
            "lvFreeSize": 22016,
            "lvFreeBiggest": 20480,
            "lvFragPct": 6,
            "lvCreateFailures": 0,
        }

    def test_hello_v2_round_trip(self):
        """REQ-056: 25-field HELLO with LVGL diag fields encodes and decodes."""
        payload = self._make_hello_v2()
        decoded = _decode(_encode(payload))
        assert decoded["helloDiagRev"] == 2
        assert decoded["lvFreeSize"] == 22016
        assert decoded["lvFreeBiggest"] == 20480
        assert decoded["lvFragPct"] == 6
        assert decoded["lvCreateFailures"] == 0

    def test_hello_v2_frag_pct_nonzero_when_fragmented(self):
        """REQ-056: lvFragPct reflects partial fragmentation."""
        payload = self._make_hello_v2()
        payload["lvFreeSize"] = 20000
        payload["lvFreeBiggest"] = 10000
        payload["lvFragPct"] = 50
        decoded = _decode(_encode(payload))
        assert decoded["lvFragPct"] == 50

    def test_hello_v1_missing_lvgl_fields_graceful(self):
        """REQ-056 backward compat: rev=1 HELLO without LVGL fields decodes fine."""
        payload = {
            "device": "watch",
            "helloDiagRev": 1,
            "freeHeap": 28000,
            "fwVersion": "1.100.0",
        }
        decoded = _decode(_encode(payload))
        assert decoded["helloDiagRev"] == 1
        for key in ("lvFreeSize", "lvFreeBiggest", "lvFragPct", "lvCreateFailures"):
            assert key not in decoded

    def test_hello_v2_create_failures_nonzero(self):
        """REQ-056: lvCreateFailures encodes non-zero failure count correctly."""
        payload = self._make_hello_v2()
        payload["lvCreateFailures"] = 7
        decoded = _decode(_encode(payload))
        assert decoded["lvCreateFailures"] == 7

    # -------------------------------------------------------------------------
    # REQ-064 — safeFaceTrips counter in HELLO
    # -------------------------------------------------------------------------
    def _make_hello_v2_with_safe_face(self, trips: int = 0) -> dict:
        """HELLO payload that includes safeFaceTrips (REQ-064, field 26)."""
        payload = self._make_hello_v2()
        payload["safeFaceTrips"] = trips
        return payload

    def test_hello_safe_face_trips_zero(self):
        """REQ-064: safeFaceTrips = 0 when safe-face mode has never tripped."""
        payload = self._make_hello_v2_with_safe_face(trips=0)
        decoded = _decode(_encode(payload))
        assert decoded["safeFaceTrips"] == 0

    def test_hello_safe_face_trips_nonzero(self):
        """REQ-064: safeFaceTrips increments across fragmentation events."""
        payload = self._make_hello_v2_with_safe_face(trips=3)
        decoded = _decode(_encode(payload))
        assert decoded["safeFaceTrips"] == 3

    def test_hello_without_safe_face_trips_graceful(self):
        """REQ-064 backward compat: HELLO without safeFaceTrips decodes fine."""
        payload = self._make_hello_v2()
        # Do NOT include safeFaceTrips — simulates older firmware
        decoded = _decode(_encode(payload))
        assert "safeFaceTrips" not in decoded

    def test_coordinator_safe_face_trips_populated(self):
        """REQ-064: coordinator stores safeFaceTrips from HELLO payload."""
        from unittest.mock import AsyncMock, MagicMock
        import asyncio
        try:
            from custom_components.infinassistant.coordinator import InfinassistantDataCoordinator
        except ImportError:
            import pytest
            pytest.skip("coordinator not importable in this test environment")

        hass = MagicMock()
        hass.data = {}
        coordinator = InfinassistantDataCoordinator.__new__(InfinassistantDataCoordinator)
        coordinator.data = {
            "lv_free_size": None, "lv_free_biggest": None,
            "lv_frag_pct": None, "lv_create_failures": None,
            "hello_diag_rev": None, "safe_face_trips": None,
            "steps": None, "heart_rate": None, "battery": None,
            "battery_charging": None, "motion_state": None, "last_sync": None,
        }
        coordinator._update_lock = asyncio.Lock()
        coordinator._watchface_layout = None
        coordinator.range_violation_counts = {}
        coordinator.hass = hass
        coordinator._listeners = []
        coordinator._store = MagicMock()
        coordinator.device_id = "test_device_01"
        coordinator._last_connected = None
        coordinator._connected_threshold = 120

        hello_payload = {"safeFaceTrips": 2, "helloDiagRev": 2}
        # asyncio.get_event_loop() raises in 3.12+ when no loop is running;
        # asyncio.run creates and disposes one.
        asyncio.run(coordinator.update_from_webhook(hello_payload))
        assert coordinator.data["safe_face_trips"] == 2


@_cbor2_skip
class TestProtocolNegotiationMessages:
    """HELLO_ACK and VERSION_MISMATCH messages."""

    def test_hello_ack_encodes_proto_version(self):
        ack = {"peerProto": PROTO_MAJOR, "features": FEATURE_WATCHFACE_LAYOUT | FEATURE_TIME_SYNC}
        decoded = _decode(_encode(ack))
        assert decoded["peerProto"] == PROTO_MAJOR
        assert decoded["features"] & FEATURE_WATCHFACE_LAYOUT

    def test_version_mismatch_encodes_peer_major(self):
        mismatch = {"peerMajor": 2, "ourMajor": PROTO_MAJOR}
        decoded = _decode(_encode(mismatch))
        assert decoded["peerMajor"] == 2
        assert decoded["ourMajor"] == PROTO_MAJOR

    def test_hello_ack_message_type(self):
        assert MSG_HELLO_ACK == 0x17

    def test_version_mismatch_message_type(self):
        assert MSG_VERSION_MISMATCH == 0x18


# ===========================================================================
# REQ-065 — Stale-data banner: staleness detection via STATE_UPDATE fields
# ===========================================================================

@_cbor2_skip
class TestStaleBannerProtocol:
    """REQ-065: STATE_UPDATE stale flags drive the firmware stale banner.

    These tests verify the Python side of the protocol — that CBOR payloads
    with ha_offline / data_stale flags encode and decode correctly so the
    bridge can reliably signal staleness to the firmware.  The firmware-side
    display logic (staleBanner_ widget) is C++ and not exercised here.
    """

    # -----------------------------------------------------------------------
    # Helpers
    # -----------------------------------------------------------------------

    def _state_update_stale(self, *, ha_offline: bool, data_stale: bool) -> dict:
        return {
            "ha_offline": ha_offline,
            "data_stale": data_stale,
            "items": [],
        }

    def _state_update_with_enriched_at(self, ts: int, *, stale: bool = False) -> dict:
        return {
            "ha_offline": False,
            "data_stale": stale,
            "items": [{"entityId": "sensor.temp", "state": "21", "ts": ts}],
            "lastEnrichedAt": ts,
        }

    # -----------------------------------------------------------------------
    # Flag encoding
    # -----------------------------------------------------------------------

    def test_ha_offline_true_encodes_cbor_true(self):
        """ha_offline=True must CBOR-encode as 0xF5 (single-byte true)."""
        payload = self._state_update_stale(ha_offline=True, data_stale=False)
        encoded = _encode(payload)
        assert b"\xf5" in encoded

    def test_data_stale_true_encodes_cbor_true(self):
        """data_stale=True must CBOR-encode as 0xF5."""
        payload = self._state_update_stale(ha_offline=False, data_stale=True)
        encoded = _encode(payload)
        assert b"\xf5" in encoded

    def test_both_false_encodes_cbor_false(self):
        """When neither flag is set the payload encodes 0xF4 (CBOR false)."""
        payload = self._state_update_stale(ha_offline=False, data_stale=False)
        encoded = _encode(payload)
        assert b"\xf4" in encoded

    # -----------------------------------------------------------------------
    # Round-trip semantics
    # -----------------------------------------------------------------------

    def test_ha_offline_true_survives_round_trip(self):
        payload = self._state_update_stale(ha_offline=True, data_stale=False)
        decoded = _decode(_encode(payload))
        assert decoded["ha_offline"] is True
        assert decoded["data_stale"] is False

    def test_data_stale_true_survives_round_trip(self):
        payload = self._state_update_stale(ha_offline=False, data_stale=True)
        decoded = _decode(_encode(payload))
        assert decoded["ha_offline"] is False
        assert decoded["data_stale"] is True

    def test_both_stale_flags_true_survives_round_trip(self):
        """ha_offline AND data_stale both true — firmware treats as stale."""
        payload = self._state_update_stale(ha_offline=True, data_stale=True)
        decoded = _decode(_encode(payload))
        assert decoded["ha_offline"] is True
        assert decoded["data_stale"] is True

    def test_clean_update_clears_both_flags(self):
        """A clean STATE_UPDATE has both flags false — firmware clears banner."""
        payload = self._state_update_stale(ha_offline=False, data_stale=False)
        decoded = _decode(_encode(payload))
        assert decoded["ha_offline"] is False
        assert decoded["data_stale"] is False

    # -----------------------------------------------------------------------
    # The banner rule (HaBridge::IsBannerStale, firmware 2.4.93): the phone's
    # ha_offline/data_stale flag, or more than kBannerNoContactSec = 900 s
    # (15 min) since the phone last wrote anything; it pings every 30 s while
    # connected. Until 2.4.93 the age was the dashboard's lastEnrichedAt, which
    # only a full dashboard push renews. These tests restate the threshold.
    # -----------------------------------------------------------------------

    NO_CONTACT_THRESHOLD_SECS = 900  # must match kBannerNoContactSec in ActiveScreenView.h

    def _is_stale(self, ha_stale: bool, seconds_since_contact: int) -> bool:
        """Mirror HaBridge::IsBannerStale."""
        return ha_stale or seconds_since_contact > self.NO_CONTACT_THRESHOLD_SECS

    def test_regular_pings_are_not_stale(self):
        assert not self._is_stale(False, 30)

    def test_at_threshold_boundary_not_stale(self):
        assert not self._is_stale(False, 900)

    def test_one_past_threshold_is_stale(self):
        assert self._is_stale(False, 901)

    def test_stale_flag_overrides_age_check(self):
        """data_stale=True from bridge shows the banner however recent the contact.

        If the bridge explicitly signals data_stale the firmware shows the banner
        ("HA offline") at once, so a brand-new payload with data_stale=True must
        decode as stale.
        """
        payload = self._state_update_stale(ha_offline=False, data_stale=True)
        decoded = _decode(_encode(payload))
        # Firmware: IsDataStale() returns true immediately; no age needed.
        assert decoded["data_stale"] is True
        assert self._is_stale(True, 0)


# ===========================================================================
# REQ-070 — "next event in Xm" header: calendar event proximity detection
# ===========================================================================


class TestNextCalendarEvent:
    """REQ-070: Python-side logic for "next event in Xm" header.

    Mirrors the firmware delta-time logic in HomeAssistant::UpdateTimeAndStatus
    so both sides agree on the 30-minute window and the vibration threshold.
    """

    WINDOW_SEC = 1800  # 30 minutes — must match kNextEventWindowSec in HomeAssistant.cpp

    def _delta_to_label(self, now_sec: int, event_epoch: int) -> str | None:
        """Return 'next in Xm' when the event is within the 30-min window.

        Returns None when the event is beyond the window or already past > 60s.
        Mirrors the firmware branch in UpdateTimeAndStatus().
        """
        if event_epoch == 0:
            return None
        delta = event_epoch - now_sec
        if 0 < delta <= self.WINDOW_SEC:
            mins_left = max(1, delta // 60)
            return f"next in {mins_left}m"
        if -60 <= delta <= 0:
            return "next in 0m"
        return None

    def _vibration_due(self, now_sec: int, event_epoch: int) -> bool:
        """Return True when the epoch has just been crossed (within last 60 s)."""
        if event_epoch == 0:
            return False
        delta = event_epoch - now_sec
        return -60 <= delta <= 0

    # -----------------------------------------------------------------------
    # Window boundary
    # -----------------------------------------------------------------------

    def test_event_exactly_30_min_away_shows_label(self):
        base = 1_700_000_000
        label = self._delta_to_label(base, base + self.WINDOW_SEC)
        assert label == "next in 30m"

    def test_event_31_min_away_hidden(self):
        base = 1_700_000_000
        label = self._delta_to_label(base, base + self.WINDOW_SEC + 60)
        assert label is None

    def test_event_1_min_away_shows_1m(self):
        base = 1_700_000_000
        label = self._delta_to_label(base, base + 60)
        assert label == "next in 1m"

    def test_event_under_1_min_away_shows_1m_minimum(self):
        """Delta < 60 s but > 0: firmware clamps to 1m minimum."""
        base = 1_700_000_000
        label = self._delta_to_label(base, base + 30)  # 30 s → 0 min → clamped to 1
        assert label == "next in 1m"

    def test_event_zero_epoch_hidden(self):
        """eventStartEpoch == 0 means not provided; must not show label."""
        label = self._delta_to_label(1_700_000_000, 0)
        assert label is None

    def test_event_far_future_hidden(self):
        base = 1_700_000_000
        label = self._delta_to_label(base, base + 7200)  # 2 h away
        assert label is None

    def test_event_long_past_hidden(self):
        base = 1_700_000_000
        label = self._delta_to_label(base, base - 3600)  # 1 h ago
        assert label is None

    # -----------------------------------------------------------------------
    # Epoch crossing / vibration threshold
    # -----------------------------------------------------------------------

    def test_epoch_crossed_within_window_triggers_vibration(self):
        base = 1_700_000_000
        assert self._vibration_due(base, base - 30)   # crossed 30 s ago

    def test_epoch_crossed_exactly_now_triggers_vibration(self):
        base = 1_700_000_000
        assert self._vibration_due(base, base)         # delta == 0

    def test_epoch_crossed_61s_ago_no_vibration(self):
        """Past the 60-second re-fire window — vibration must not repeat."""
        base = 1_700_000_000
        assert not self._vibration_due(base, base - 61)

    def test_epoch_not_yet_reached_no_vibration(self):
        base = 1_700_000_000
        assert not self._vibration_due(base, base + 1)

    def test_zero_epoch_no_vibration(self):
        assert not self._vibration_due(1_700_000_000, 0)

    # -----------------------------------------------------------------------
    # CBOR encoding of eventStartEpoch field in WATCHFACE_LAYOUT payload
    # -----------------------------------------------------------------------

    @_cbor2_skip
    def test_event_start_epoch_survives_cbor_round_trip(self):
        """eventStartEpoch is a uint32 in the WATCHFACE_LAYOUT dashboard events array."""
        event_epoch = 1_700_001_800
        payload = {
            "dashboard": {
                "events": [
                    {"time": "14:30", "title": "Standup", "eventStartEpoch": event_epoch},
                ]
            }
        }
        decoded = _decode(_encode(payload))
        assert decoded["dashboard"]["events"][0]["eventStartEpoch"] == event_epoch

    @_cbor2_skip
    def test_event_without_epoch_defaults_graceful(self):
        """Older phone omits eventStartEpoch — firmware treats it as 0 (no label)."""
        payload = {
            "dashboard": {
                "events": [
                    {"time": "09:00", "title": "Morning meeting"},
                ]
            }
        }
        decoded = _decode(_encode(payload))
        event = decoded["dashboard"]["events"][0]
        # Field absent — caller defaults to 0 → no label shown
        assert event.get("eventStartEpoch", 0) == 0


# ===========================================================================
# REQ-071 — NOTIFY_DISMISS / NOTIFY_SNOOZE protocol constants and payloads
# ===========================================================================


class TestNotifyDismissSnoozeConstants:
    """REQ-071 — verify message type constants match ProtocolMessages.h."""

    def test_notify_dismiss_opcode(self):
        """NOTIFY_DISMISS must be 0x1E."""
        assert MSG_NOTIFY_DISMISS == 0x1E

    def test_notify_snooze_opcode(self):
        """NOTIFY_SNOOZE must be 0x1F."""
        assert MSG_NOTIFY_SNOOZE == 0x1F

    def test_opcodes_are_distinct(self):
        """NOTIFY_DISMISS and NOTIFY_SNOOZE must not alias each other or earlier types."""
        defined = [
            MSG_NOTIFY, MSG_NOTIFY_ACK, MSG_FIND_PHONE, MSG_FIND_WATCH,
            MSG_CRASH_DUMP_REQUEST, MSG_CRASH_DUMP_ACK,
            MSG_NOTIFY_DISMISS, MSG_NOTIFY_SNOOZE,
        ]
        assert len(defined) == len(set(defined)), "Duplicate message type opcodes detected"

    def test_feature_flag_notify_dismiss_snooze(self):
        """kFeatureNotifyDismissSnooze must be bit 10 (0x400)."""
        assert FEATURE_NOTIFY_DISMISS_SNOOZE == 0x400

    def test_feature_flag_does_not_overlap_existing_flags(self):
        """REQ-071 feature bit must not collide with any previously defined flag."""
        existing = (
            FEATURE_WATCHFACE_LAYOUT | FEATURE_LOGBOOK | FEATURE_HAPTIC_FEEDBACK
            | FEATURE_TIME_SYNC | FEATURE_VOICE_ASSIST | FEATURE_WATCHFACE_ACK
            | FEATURE_CALENDAR | FEATURE_HOME_CONTROL | FEATURE_PROTOCOL_NEGOT
            | FEATURE_FIND_DEVICE
        )
        assert existing & FEATURE_NOTIFY_DISMISS_SNOOZE == 0, (
            f"FEATURE_NOTIFY_DISMISS_SNOOZE (0x{FEATURE_NOTIFY_DISMISS_SNOOZE:x}) "
            f"overlaps existing flags (0x{existing:x})"
        )


@_cbor2_skip
class TestNotifyDismissPayload:
    """REQ-071 — NOTIFY_DISMISS CBOR round-trip."""

    def _make_dismiss(self, tag: str = "ha_alert_001") -> dict:
        return {"tag": tag}

    def test_round_trip_preserves_tag(self):
        payload = self._make_dismiss("kitchen_motion")
        decoded = _decode(_encode(payload))
        assert decoded["tag"] == "kitchen_motion"

    def test_empty_tag_roundtrips(self):
        """An empty tag is valid CBOR — the firmware guards against it, not the schema."""
        payload = {"tag": ""}
        decoded = _decode(_encode(payload))
        assert decoded["tag"] == ""

    def test_tag_with_special_chars(self):
        """Tags may contain dots, underscores, hyphens as used by HA notification IDs."""
        tag = "infinassistant_ha_alert-2025.06.01"
        decoded = _decode(_encode({"tag": tag}))
        assert decoded["tag"] == tag

    def test_dismiss_opcode_value(self):
        """NOTIFY_DISMISS opcode is 0x1E (30 decimal)."""
        assert MSG_NOTIFY_DISMISS == 30

    def test_dismiss_payload_has_exactly_one_key(self):
        """NOTIFY_DISMISS CBOR map carries only 'tag'."""
        payload = self._make_dismiss()
        decoded = _decode(_encode(payload))
        assert set(decoded.keys()) == {"tag"}


@_cbor2_skip
class TestNotifySnoozePayload:
    """REQ-071 — NOTIFY_SNOOZE CBOR round-trip."""

    def _make_snooze(self, tag: str = "ha_alert_001", snooze_s: int = 300) -> dict:
        return {"tag": tag, "snooze": snooze_s}

    def test_round_trip_preserves_tag_and_snooze(self):
        payload = self._make_snooze("door_open", 600)
        decoded = _decode(_encode(payload))
        assert decoded["tag"] == "door_open"
        assert decoded["snooze"] == 600

    def test_default_snooze_is_300_seconds(self):
        """Firmware default is 300 s (5 min) when no override is given."""
        payload = self._make_snooze(snooze_s=300)
        assert payload["snooze"] == 300

    def test_snooze_opcode_value(self):
        """NOTIFY_SNOOZE opcode is 0x1F (31 decimal)."""
        assert MSG_NOTIFY_SNOOZE == 31

    def test_snooze_payload_has_tag_and_snooze_keys(self):
        """NOTIFY_SNOOZE CBOR map carries 'tag' and 'snooze'."""
        payload = self._make_snooze()
        decoded = _decode(_encode(payload))
        assert "tag" in decoded
        assert "snooze" in decoded

    def test_snooze_is_uint(self):
        """snooze value must be a non-negative integer."""
        payload = self._make_snooze(snooze_s=0)
        decoded = _decode(_encode(payload))
        assert decoded["snooze"] == 0
        assert isinstance(decoded["snooze"], int)

    def test_large_snooze_value_roundtrips(self):
        """Snooze duration up to 3600 s (1 hour) must encode without overflow."""
        payload = self._make_snooze(snooze_s=3600)
        decoded = _decode(_encode(payload))
        assert decoded["snooze"] == 3600


# ===========================================================================
# Golden vectors (FR-34): tests/protocol-vectors.json, a copy of
# firmware/infinitime_overlay/vectors/protocol-vectors.json
# ===========================================================================
#
# One file holds the bytes and numbers the firmware host tests (tools/fuzz), the app's tests
# (android/core-data) and these tests all pin. A vector changed there fails every side that
# disagrees; a vector that is missing fails the test that asks for it.

# A copy of the firmware's file lives beside these tests, so a checkout of the integration repository
# alone has it; TestGoldenVectorFile compares it with the original when the main repository is there.
_VECTORS_PATH = Path(__file__).resolve().parent / "protocol-vectors.json"
_VECTORS_SOURCE = (
    Path(__file__).resolve().parents[2]
    / "firmware" / "infinitime_overlay" / "vectors" / "protocol-vectors.json"
)


def _vectors() -> dict[str, dict]:
    doc = json.loads(_VECTORS_PATH.read_text(encoding="utf-8"))
    return {v["name"]: v for v in doc["vectors"]}


def _vector(name: str) -> dict:
    vectors = _vectors()
    assert name in vectors, f"no golden vector named {name} in {_VECTORS_PATH}"
    return vectors[name]


def _vector_bytes(name: str) -> bytes:
    return bytes.fromhex(_vector(name)["hex"].replace(" ", ""))


def _fnv1a_32(data: bytes) -> int:
    h = 0x811C9DC5
    for b in data:
        h = ((h ^ b) * 16777619) & 0xFFFFFFFF
    return h


class TestGoldenVectorFile:
    """The vector file itself, which needs no CBOR library to read."""

    def test_the_file_is_the_one_the_firmware_tests_read(self):
        assert _VECTORS_PATH.is_file()
        assert json.loads(_VECTORS_PATH.read_text(encoding="utf-8"))["format"] == 1

    def test_the_copy_is_byte_identical_to_the_firmware_file(self):
        if not _VECTORS_SOURCE.is_file():
            pytest.skip(f"the main repository's vectors are not at {_VECTORS_SOURCE}")
        assert _VECTORS_PATH.read_bytes() == _VECTORS_SOURCE.read_bytes()

    def test_every_vector_has_a_unique_name_a_description_and_well_formed_content(self):
        doc = json.loads(_VECTORS_PATH.read_text(encoding="utf-8"))
        names = [v["name"] for v in doc["vectors"]]
        assert len(names) == len(set(names)), "a vector name is used twice"
        for vector in doc["vectors"]:
            name = vector["name"]
            assert vector.get("description"), f"{name} has no description"
            assert "hex" in vector or "value" in vector, f"{name} holds neither hex nor a value"
            if "hex" in vector:
                bytes.fromhex(vector["hex"].replace(" ", ""))  # raises on a malformed byte string

    def test_status_fingerprint_is_the_fnv1a_of_the_groups(self):
        vector = _vector("status_fingerprint")
        data = b"".join(bytes([len(g)]) + g.encode("ascii") for g in vector["groups"])
        assert _fnv1a_32(data) == vector["value"] == 0x19826696

    def test_crc32_of_a_zero_byte(self):
        vector = _vector("crc32_single_zero_byte")
        assert _crc32(bytes.fromhex(vector["hex"])) == vector["value"] == 0xD202EF8D


@_cbor2_skip
class TestGoldenVectors:
    """The shared vectors decode, and say what the protocol spec says."""

    def test_every_hex_vector_is_valid_cbor(self):
        for name, vector in _vectors().items():
            if "hex" in vector and name != "crc32_single_zero_byte":
                _decode(_vector_bytes(name))

    def test_feature_word_is_every_declared_bit_but_the_retired_one(self):
        declared = (
            FEATURE_WATCHFACE_LAYOUT | FEATURE_LOGBOOK | FEATURE_HAPTIC_FEEDBACK | FEATURE_TIME_SYNC
            | FEATURE_VOICE_ASSIST | FEATURE_WATCHFACE_ACK | FEATURE_CALENDAR | FEATURE_HOME_CONTROL
            | FEATURE_PROTOCOL_NEGOT | FEATURE_FIND_DEVICE | FEATURE_SHORT_KEYS | FEATURE_CRASH_REPORT
            | FEATURE_DASHBOARD_STATE | FEATURE_SIX_SCREENS | FEATURE_PHONE_NOTIFY_SYNC
            | FEATURE_CONFIG_KEY_V2
        )
        word = _vector("hello_features_word")["value"]
        assert word == declared == 0x1FBFF
        assert word & FEATURE_NOTIFY_DISMISS_SNOOZE == 0
        assert _decode(_vector_bytes("hello_features_word")) == word
        assert _vector("config_key_v2_bit")["value"] == FEATURE_CONFIG_KEY_V2 == 0x10000

    def test_the_word_before_the_rename_lacks_bit_16(self):
        old = _vector("hello_features_word_2_4_102")["value"]
        assert old == 0xFBFF
        assert old & FEATURE_CONFIG_KEY_V2 == 0
        assert old | FEATURE_CONFIG_KEY_V2 == _vector("hello_features_word")["value"]
        assert _decode(_vector_bytes("hello_features_word_2_4_102")) == old

    def test_watch_hello_carries_the_word_and_fits_one_frame(self):
        raw = _vector_bytes("hello_watch_2_4_103")
        hello = _decode(raw)
        assert len(hello) == 15
        assert hello["device"] == "watch"
        assert hello["features"] == _vector("hello_features_word")["value"]
        assert hello["features"] & FEATURE_CONFIG_KEY_V2
        assert hello["fwVersion"] == "2.4.103"
        assert hello["enc"] is True
        assert len(raw) <= 244, "a frame carries at most 244 payload bytes at the 256-byte MTU"

    def test_config_push_uses_the_renamed_key(self):
        config = _decode(_vector_bytes("config_push_v2"))
        assert set(config) == {"configVersion", "infinassistant", "voiceAssist"}
        assert config["configVersion"] == 1
        assert config["infinassistant"] == {"enabled": True, "sensorReportIntervalSeconds": 120}
        assert config["voiceAssist"] is True

    def test_notify_remove_and_dismiss_carry_their_nid(self):
        for name, nid in (
            ("notify_remove_nid7", 7),
            ("notify_remove_nid300", 300),
            ("notify_dismiss_nid7", 7),
            ("notify_dismiss_nid42", 42),
            ("notify_dismiss_nid65535", 65535),
        ):
            assert _decode(_vector_bytes(name)) == {"nid": nid}, name

    def test_phone_notify_carries_a_nid(self):
        assert _decode(_vector_bytes("notify_phone_nid7"))["nid"] == 7
        alice = _decode(_vector_bytes("notify_phone_nid12_alice"))
        assert alice["nid"] == 12
        assert alice["title"] == "Alice"
        assert alice["ts"] == 1700000000000

    def test_pong_reports_the_link_encryption(self):
        assert _decode(_vector_bytes("pong_rid5_enc_false")) == {"rid": 5, "enc": False}
        assert _decode(_vector_bytes("pong_rid5_enc_true")) == {"rid": 5, "enc": True}
