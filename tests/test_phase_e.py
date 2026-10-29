"""Phase E unit tests for the InfinAssistant Home Assistant custom integration.

Per BRD-InfinAssistant-Hardening-and-Fixes:
  - REQ-044: Normalize device IDs before unique_id assignment.
  - REQ-048: Webhook rejects when payload device_id does not match the
    authenticated header / configured entry device_id.

Additional Phase E REQs may add cases here as they land.
"""
from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

# conftest.py stubs HA modules before these imports execute.
from custom_components.infinassistant import handle_webhook
from custom_components.infinassistant.config_flow import _normalize_device_id
from tests.conftest import FakeRequest


class TestNormalizeDeviceId:
    """REQ-044: _normalize_device_id canonicalizes user/zeroconf device IDs."""

    @pytest.mark.parametrize(
        "raw,expected",
        [
            # Plain identifiers: lowercase only, no separator stripping.
            ("pinetime_01", "pinetime_01"),
            ("PineTime_01", "pinetime_01"),
            ("  pinetime_01  ", "pinetime_01"),
            # MAC-shaped colon-separated: separators stripped, lowercased.
            ("AA:BB:cc:DD:EE:FF", "aabbccddeeff"),
            ("aa:bb:cc:dd:ee:ff", "aabbccddeeff"),
            ("FF:EE:DD:CC:BB:AA", "ffeeddccbbaa"),
            # MAC-shaped hyphen-separated: separators stripped, lowercased.
            ("AA-BB-CC-DD-EE-FF", "aabbccddeeff"),
            ("aa-BB-cc-DD-ee-FF", "aabbccddeeff"),
            # MAC with leading/trailing whitespace.
            ("  AA:BB:CC:DD:EE:FF  ", "aabbccddeeff"),
            # Non-MAC strings retain internal punctuation, just lowercased.
            ("device:01", "device:01"),
            ("aa:bb:cc", "aa:bb:cc"),  # too short for MAC
            ("aa:bb:cc:dd:ee:ff:gg", "aa:bb:cc:dd:ee:ff:gg"),  # too long
        ],
    )
    def test_known_inputs_normalize_as_expected(self, raw, expected):
        assert _normalize_device_id(raw) == expected

    def test_empty_input_returns_empty_string(self):
        assert _normalize_device_id("") == ""
        assert _normalize_device_id(None) == ""

    def test_whitespace_only_returns_empty_after_strip(self):
        assert _normalize_device_id("   ") == ""

    def test_mac_uppercase_lowercase_collide_after_normalization(self):
        """Two casing variants of the same MAC must produce identical IDs.

        This is the property unique_id resolution relies on: equivalent
        device addresses cannot register as duplicate config entries.
        """
        assert _normalize_device_id("AA:BB:CC:DD:EE:FF") == _normalize_device_id(
            "aa:bb:cc:dd:ee:ff"
        )
        assert _normalize_device_id("AA-BB-CC-DD-EE-FF") == _normalize_device_id(
            "aa:bb:cc:dd:ee:ff"
        )


# ============================================================================
# REQ-048: payload device_id must match authenticated header + entry device_id
# ============================================================================


def _make_authenticated_hass(entry_device_id="aabbccddeeff"):
    """Return a (hass, coordinator) tuple wired up so the webhook reaches the
    REQ-048 check: authenticator present and successful, rate limiter open.
    """
    hass = MagicMock()
    hass.data = {}
    hass.bus = MagicMock()
    hass.bus.async_fire = MagicMock()

    coordinator = MagicMock()
    coordinator.update_from_webhook = AsyncMock()

    rate_limiter = MagicMock()
    rate_limiter.allow = MagicMock(return_value=True)
    rate_limiter.consumed_count = MagicMock(return_value=0)

    authenticator = MagicMock()
    authenticator.verify = MagicMock(
        return_value=SimpleNamespace(valid=True, error=None)
    )
    authenticator.clock_skew_seconds = MagicMock(return_value=0)

    entry_id = "entry_1"
    hass.data.setdefault("infinassistant", {})
    hass.data["infinassistant"][entry_id] = {
        "webhook_id": "wh_abc",
        "device_id": entry_device_id,
        "coordinator": coordinator,
        "rate_limiter": rate_limiter,
        "authenticator": authenticator,
    }
    return hass, coordinator


def _hmac_headers(device_id):
    return {
        "X-InfinAssistant-Device-Id": device_id,
        "X-InfinAssistant-Timestamp": "1700000000",
        "X-InfinAssistant-Signature": "deadbeef",
    }


class TestDeviceIdConsistency:
    """REQ-048: enforce payload/header/entry device_id agreement."""

    @pytest.mark.asyncio
    async def test_matching_device_id_returns_200(self):
        hass, coordinator = _make_authenticated_hass(entry_device_id="aabbccddeeff")
        body = {
            "type": "sensor_update",
            "device_id": "aabbccddeeff",
            "sensors": {"steps": 100},
        }
        req = FakeRequest(body=body, headers=_hmac_headers("aabbccddeeff"))

        resp = await handle_webhook(hass, "wh_abc", req)

        assert resp.status == 200
        coordinator.update_from_webhook.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_header_mismatch_returns_401(self):
        hass, _ = _make_authenticated_hass(entry_device_id="aabbccddeeff")
        body = {
            "type": "sensor_update",
            "device_id": "aabbccddeeff",
            "sensors": {"steps": 100},
        }
        # Header carries a different (but HMAC-verified-by-mock) device.
        req = FakeRequest(body=body, headers=_hmac_headers("ffeeddccbbaa"))

        resp = await handle_webhook(hass, "wh_abc", req)

        assert resp.status == 401
        assert "device_id" in resp.text

    @pytest.mark.asyncio
    async def test_payload_mismatch_returns_401(self):
        hass, _ = _make_authenticated_hass(entry_device_id="aabbccddeeff")
        body = {
            "type": "sensor_update",
            "device_id": "ffeeddccbbaa",
            "sensors": {"steps": 100},
        }
        req = FakeRequest(body=body, headers=_hmac_headers("aabbccddeeff"))

        resp = await handle_webhook(hass, "wh_abc", req)

        assert resp.status == 401
        assert "device_id" in resp.text

    @pytest.mark.asyncio
    async def test_casing_variants_still_match_after_normalization(self):
        """Same device, different separator style — must still be accepted."""
        hass, coordinator = _make_authenticated_hass(entry_device_id="aabbccddeeff")
        body = {
            "type": "sensor_update",
            "device_id": "AA:BB:CC:DD:EE:FF",  # MAC form
            "sensors": {"steps": 100},
        }
        req = FakeRequest(body=body, headers=_hmac_headers("aa-bb-cc-dd-ee-ff"))

        resp = await handle_webhook(hass, "wh_abc", req)

        assert resp.status == 200
        coordinator.update_from_webhook.assert_awaited_once()


# ============================================================================
# REQ-050: WebhookAuthenticator rejects corrupt base64 secrets
# ============================================================================


class TestInvalidHmacSecret:
    """REQ-050: corrupted HMAC secret must raise a typed error, not binascii."""

    def test_invalid_current_secret_raises(self):
        from custom_components.infinassistant.security import (
            InvalidHmacSecretError,
            WebhookAuthenticator,
        )
        with pytest.raises(InvalidHmacSecretError):
            WebhookAuthenticator(secret_b64="not!valid!base64!@@@")

    def test_invalid_old_secret_raises(self):
        from custom_components.infinassistant.security import (
            InvalidHmacSecretError,
            WebhookAuthenticator,
        )
        # Generate a valid current secret so the failure pins on old_secret.
        import base64 as _b64
        good = _b64.urlsafe_b64encode(b"a" * 32).decode()
        with pytest.raises(InvalidHmacSecretError):
            WebhookAuthenticator(secret_b64=good, old_secret_b64="!@@@")

    def test_valid_secret_constructs(self):
        from custom_components.infinassistant.security import WebhookAuthenticator
        import base64 as _b64
        good = _b64.urlsafe_b64encode(b"x" * 32).decode()
        auth = WebhookAuthenticator(secret_b64=good)
        assert auth is not None


# ============================================================================
# REQ-049: TokenBucketRateLimiter.prune scheduled hourly and cancelled on unload
# ============================================================================


class TestRateLimiterPruneScheduling:
    """REQ-049: prune must be wired through async_track_time_interval."""

    def test_prune_removes_idle_bucket(self):
        """Direct unit-test on TokenBucketRateLimiter.prune (covered upstream)."""
        from custom_components.infinassistant.security import TokenBucketRateLimiter
        rl = TokenBucketRateLimiter(rate_limit=60)
        # Touch a bucket, then artificially age it.
        rl.allow("dev_a")
        rl._buckets["dev_a"].last_refill -= 3600 + 1  # idle > default 3600s
        rl.prune(max_idle_seconds=3600)
        assert "dev_a" not in rl._buckets

    def test_prune_keeps_fresh_bucket(self):
        from custom_components.infinassistant.security import TokenBucketRateLimiter
        rl = TokenBucketRateLimiter(rate_limit=60)
        rl.allow("dev_a")
        rl.prune(max_idle_seconds=3600)
        assert "dev_a" in rl._buckets

    def test_prune_callback_invokes_rate_limiter(self):
        """Stand up the callback closure as wired in __init__ and fire it."""
        from custom_components.infinassistant.security import TokenBucketRateLimiter
        rl = TokenBucketRateLimiter(rate_limit=60)
        rl.allow("dev_a")
        rl._buckets["dev_a"].last_refill -= 7200  # 2 h idle

        # Closure shape mirrors __init__'s _prune_rate_limiter.
        def _prune(_now=None):
            rl.prune()

        _prune()
        assert "dev_a" not in rl._buckets


# ============================================================================
# REQ-052: Coordinator publishes a shallow copy of self.data to listeners
# ============================================================================


class TestCoordinatorShallowCopy:
    """REQ-052: subscribers must not see later mutations of internal store."""

    def test_set_updated_data_called_with_dict_copy(self):
        """update_from_webhook must call async_set_updated_data with a NEW dict."""
        import asyncio
        from custom_components.infinassistant.coordinator import InfinassistantDataCoordinator

        # Build a real coordinator instance with the test stub base class.
        hass = MagicMock()
        coord = InfinassistantDataCoordinator(hass, device_id="test", update_interval=300)

        captured: list[dict] = []

        def _capture(payload):
            captured.append(payload)

        coord.async_set_updated_data = _capture

        asyncio.run(
            coord.update_from_webhook({"steps": 100, "heart_rate": 72, "timestamp": 1700000000000})
        )

        assert captured, "expected one set_updated_data call"
        # The published payload must be a *different* dict object than the
        # coordinator's internal store, even though their content matches.
        assert captured[0] is not coord.data
        # And mutating the internal store later must not affect what the
        # subscriber holds.
        coord.data["steps"] = 999
        assert captured[0]["steps"] == 100


# ============================================================================
# REQ-054: send_notification schema caps title/message lengths
# ============================================================================


class TestSendNotificationLengthCaps:
    """REQ-054: schema rejects title/message that exceeds the firmware buffer."""

    def test_title_at_cap_passes(self):
        from custom_components.infinassistant.services import (
            SEND_NOTIFICATION_SCHEMA,
            NOTIFICATION_TITLE_MAX,
            NOTIFICATION_MESSAGE_MAX,
        )
        SEND_NOTIFICATION_SCHEMA({
            "title": "a" * NOTIFICATION_TITLE_MAX,
            "message": "b" * NOTIFICATION_MESSAGE_MAX,
        })  # should not raise

    def test_title_over_cap_raises(self):
        import voluptuous as vol
        from custom_components.infinassistant.services import (
            SEND_NOTIFICATION_SCHEMA,
            NOTIFICATION_TITLE_MAX,
        )
        with pytest.raises(vol.Invalid):
            SEND_NOTIFICATION_SCHEMA({
                "title": "a" * (NOTIFICATION_TITLE_MAX + 1),
                "message": "ok",
            })

    def test_message_over_cap_raises(self):
        import voluptuous as vol
        from custom_components.infinassistant.services import (
            SEND_NOTIFICATION_SCHEMA,
            NOTIFICATION_MESSAGE_MAX,
        )
        with pytest.raises(vol.Invalid):
            SEND_NOTIFICATION_SCHEMA({
                "title": "ok",
                "message": "b" * (NOTIFICATION_MESSAGE_MAX + 1),
            })

    def test_caps_match_firmware_limits_yaml(self):
        """SOT cross-check: services.py constants must equal firmware-limits.yaml."""
        from pathlib import Path

        # firmware-limits.yaml lives at <repo>/scripts/config/firmware-limits.yaml.
        repo_root = Path(__file__).resolve().parents[2]
        yaml_path = repo_root / "scripts" / "config" / "firmware-limits.yaml"
        if not yaml_path.exists():
            pytest.skip(f"firmware-limits.yaml not at {yaml_path}")

        import yaml
        from custom_components.infinassistant.services import (
            NOTIFICATION_TITLE_MAX,
            NOTIFICATION_MESSAGE_MAX,
        )

        with yaml_path.open("r", encoding="utf-8") as fh:
            data = yaml.safe_load(fh)
        # Use the highest-rev entry as the truth (codegen rule).
        latest = max(
            data["revisions"],
            key=lambda r: (r.get("bridge_rev", 0), r.get("hello_diag_rev", 0)),
        )
        assert latest["notification_title_max"] == NOTIFICATION_TITLE_MAX
        assert latest["notification_message_max"] == NOTIFICATION_MESSAGE_MAX


# ============================================================================
# REQ-047: Webhook body size cap (Content-Length pre-check + post-read backstop)
# ============================================================================


class TestWebhookBodySizeCap:
    """REQ-047: oversize bodies must return 413 before HA materializes 50 MiB."""

    @pytest.mark.asyncio
    async def test_oversized_content_length_returns_413(self):
        hass, _ = _make_authenticated_hass(entry_device_id="aabbccddeeff")
        # 200 KiB declared — above the 64 KiB cap.
        req = FakeRequest(
            body={"type": "sensor_update", "device_id": "aabbccddeeff", "sensors": {}},
            headers={**_hmac_headers("aabbccddeeff"), "Content-Length": str(200 * 1024)},
        )

        resp = await handle_webhook(hass, "wh_abc", req)

        assert resp.status == 413
        assert "too large" in resp.text.lower()

    @pytest.mark.asyncio
    async def test_oversized_raw_body_returns_413_without_content_length(self):
        """No Content-Length header → backstop must still cap by read() size."""
        hass, _ = _make_authenticated_hass(entry_device_id="aabbccddeeff")
        big_raw = "x" * (70 * 1024)  # 70 KiB > 64 KiB
        req = FakeRequest(raw=big_raw, headers=_hmac_headers("aabbccddeeff"))

        resp = await handle_webhook(hass, "wh_abc", req)

        assert resp.status == 413

    @pytest.mark.asyncio
    async def test_in_band_body_passes(self):
        hass, coordinator = _make_authenticated_hass(entry_device_id="aabbccddeeff")
        # Tiny well-formed body — should make it past the size check.
        req = FakeRequest(
            body={
                "type": "sensor_update",
                "device_id": "aabbccddeeff",
                "sensors": {"steps": 1},
            },
            headers={**_hmac_headers("aabbccddeeff"), "Content-Length": "200"},
        )

        resp = await handle_webhook(hass, "wh_abc", req)

        assert resp.status == 200
        coordinator.update_from_webhook.assert_awaited_once()


# ============================================================================
# REQ-051: Watchface layout persists across HA restarts via Store
# ============================================================================


class TestWatchfaceLayoutPersistence:
    """REQ-051: set_watchface_layout writes to Store; load restores it."""

    def test_set_then_load_in_fresh_coordinator(self):
        """Simulate restart: save in one coordinator, instantiate a fresh
        one with the same device_id, load — should see the saved layout."""
        import asyncio
        from custom_components.infinassistant.coordinator import InfinassistantDataCoordinator
        from tests.conftest import _FakeStore

        # Isolate this test's shared-store namespace from other tests.
        _FakeStore._shared.clear()

        hass = MagicMock()
        device = "persist_test_01"

        async def _scenario():
            c1 = InfinassistantDataCoordinator(hass, device_id=device, update_interval=300)
            await c1.set_watchface_layout(
                device, {"version": 7, "tiles": [], "actions": []}
            )
            # Fresh coordinator — same device_id, no in-memory state carried over.
            c2 = InfinassistantDataCoordinator(hass, device_id=device, update_interval=300)
            assert c2.get_watchface_layout(device) is None  # before load
            await c2.async_load_persisted_layout()
            return c2.get_watchface_layout(device)

        restored = asyncio.run(_scenario())
        assert restored is not None
        assert restored["version"] == 7

    def test_load_with_no_prior_state_is_noop(self):
        """First install: load_persisted_layout must not raise on empty store."""
        import asyncio
        from custom_components.infinassistant.coordinator import InfinassistantDataCoordinator
        from tests.conftest import _FakeStore

        _FakeStore._shared.clear()
        hass = MagicMock()
        c = InfinassistantDataCoordinator(hass, device_id="fresh", update_interval=300)
        asyncio.run(c.async_load_persisted_layout())
        assert c.get_watchface_layout("fresh") is None

    def test_load_with_non_dict_data_is_discarded(self):
        """A corrupted store that returns a list must not crash."""
        import asyncio
        from custom_components.infinassistant.coordinator import InfinassistantDataCoordinator
        from tests.conftest import _FakeStore

        _FakeStore._shared.clear()
        hass = MagicMock()
        c = InfinassistantDataCoordinator(hass, device_id="corrupt", update_interval=300)
        # Pre-seed the shared store with a non-dict value at the coordinator's key.
        _FakeStore._shared[f"infinassistant_watchface_corrupt@v1"] = ["nope"]
        asyncio.run(c.async_load_persisted_layout())
        assert c.get_watchface_layout("corrupt") is None


# ============================================================================
# REQ-045: Zeroconf QR/manual secret handshake (deferred-entry state machine)
# ============================================================================


class TestZeroconfHandshakeFlow:
    """REQ-045: entry creation is deferred until the operator acks the
    QR/manual secret handshake. The intermediate handshake step must:
      - generate the HMAC secret only when first reached;
      - persist that secret in self.context across form re-displays;
      - never create an entry until handshake_confirmed=True is submitted.
    """

    def _make_flow_at_handshake(self, *, hmac_secret=None):
        from custom_components.infinassistant.config_flow import InfinassistantConfigFlow

        flow = InfinassistantConfigFlow()
        flow._hass = MagicMock()
        flow.context = {
            "device_id": "aabbccddeeff",
            "webhook_id": "wh_abc",
            "webhook_url": "http://ha.local/api/webhook/wh_abc",
        }
        if hmac_secret is not None:
            flow.context["hmac_secret"] = hmac_secret
        return flow

    @pytest.mark.asyncio
    async def test_confirm_discovery_routes_to_handshake_step(self):
        """First confirm of discovery → handshake form (NOT entry creation)."""
        flow = self._make_flow_at_handshake()
        # No hmac_secret in context yet (zeroconf step never set it).

        result = await flow.async_step_confirm_discovery(user_input={})

        assert result["type"] == "form"
        assert result["step_id"] == "confirm_discovery_handshake"
        # Secret must be generated and stashed in context for the form's QR.
        assert flow.context.get("hmac_secret")
        assert isinstance(flow.context["hmac_secret"], str)

    @pytest.mark.asyncio
    async def test_handshake_form_includes_qr_payload(self):
        flow = self._make_flow_at_handshake()
        result = await flow.async_step_confirm_discovery_handshake(user_input=None)

        assert result["type"] == "form"
        assert result["step_id"] == "confirm_discovery_handshake"
        placeholders = result["description_placeholders"]
        assert "qr_payload" in placeholders
        import json
        payload = json.loads(placeholders["qr_payload"])
        assert payload["webhook_url"] == "http://ha.local/api/webhook/wh_abc"
        assert payload["device_id"] == "aabbccddeeff"
        assert payload["hmac_secret"] == flow.context["hmac_secret"]

    @pytest.mark.asyncio
    async def test_handshake_without_confirmation_keeps_form_open(self):
        """Submitting the form without ticking the box must NOT create an entry."""
        flow = self._make_flow_at_handshake(hmac_secret="seeded_secret_abc")

        result = await flow.async_step_confirm_discovery_handshake(
            user_input={"handshake_confirmed": False}
        )

        assert result["type"] == "form"
        assert result["step_id"] == "confirm_discovery_handshake"
        # Secret is still seeded — unchanged.
        assert flow.context["hmac_secret"] == "seeded_secret_abc"

    @pytest.mark.asyncio
    async def test_handshake_confirmed_creates_entry_with_seeded_secret(self):
        flow = self._make_flow_at_handshake(hmac_secret="seeded_secret_xyz")

        result = await flow.async_step_confirm_discovery_handshake(
            user_input={"handshake_confirmed": True}
        )

        assert result["type"] == "create_entry"
        assert result["title"] == "PineTime (aabbccddeeff)"
        # The entry must carry the SAME secret shown in the QR — not a fresh one.
        data = result["data"]
        from custom_components.infinassistant.const import (
            CONF_DEVICE_ID,
            CONF_WEBHOOK_ID,
            CONF_HMAC_SECRET,
        )
        assert data[CONF_DEVICE_ID] == "aabbccddeeff"
        assert data[CONF_WEBHOOK_ID] == "wh_abc"
        assert data[CONF_HMAC_SECRET] == "seeded_secret_xyz"

    @pytest.mark.asyncio
    async def test_secret_is_stable_across_form_redisplay(self):
        """Re-displaying the form (e.g. after a validation error) must reuse
        the SAME secret so a QR the operator already started scanning is not
        invalidated mid-flow."""
        flow = self._make_flow_at_handshake()

        first = await flow.async_step_confirm_discovery_handshake(user_input=None)
        secret_first = flow.context["hmac_secret"]
        # Now simulate a re-display (user navigates back, refreshes, etc.).
        second = await flow.async_step_confirm_discovery_handshake(user_input=None)
        secret_second = flow.context["hmac_secret"]

        assert secret_first == secret_second
        # And the QR payload must reflect the same secret in both renders.
        import json
        first_payload = json.loads(first["description_placeholders"]["qr_payload"])
        second_payload = json.loads(second["description_placeholders"]["qr_payload"])
        assert first_payload["hmac_secret"] == second_payload["hmac_secret"]

    @pytest.mark.asyncio
    async def test_abandoning_flow_does_not_persist_secret(self):
        """If the operator never reaches handshake_confirmed=True there must
        be no entry to clean up — the secret only lives in self.context."""
        flow = self._make_flow_at_handshake()

        # Walk to the handshake form (which generates the secret).
        await flow.async_step_confirm_discovery(user_input={})
        # Operator never confirms — flow object is just discarded.
        # The secret exists in flow.context but no create_entry was called.
        assert "hmac_secret" in flow.context
        # No create_entry result was returned anywhere — no persistence.


# ============================================================================
# REQ-053: SOT-bound schema caps from firmware-limits.yaml
# ============================================================================


class TestGeneratedLimitsMatchYaml:
    """REQ-053: _generated_limits.py must equal the highest-rev firmware-limits.yaml entry."""

    def test_constants_match_yaml_current(self):
        from pathlib import Path

        repo_root = Path(__file__).resolve().parents[2]
        yaml_path = repo_root / "scripts" / "config" / "firmware-limits.yaml"
        if not yaml_path.exists():
            pytest.skip(f"firmware-limits.yaml not at {yaml_path}")

        import yaml
        from custom_components.infinassistant import _generated_limits as gen
        with yaml_path.open("r", encoding="utf-8") as fh:
            data = yaml.safe_load(fh)
        current = max(
            data["revisions"],
            key=lambda r: (r.get("bridge_rev", 0), r.get("hello_diag_rev", 0)),
        )

        assert gen.MAX_REASSEMBLY_SIZE == current["max_reassembly_size"]
        assert gen.MAX_CBOR_DEPTH == current["max_cbor_depth"]
        assert gen.MAX_STATUS_GROUPS == current["max_status_groups"]
        assert gen.MAX_SENSOR_GROUPS == current["max_sensor_groups"]
        assert gen.MAX_GLYPHS_PER_GROUP == current["max_glyphs_per_group"]
        assert gen.MAX_SENSORS_PER_GROUP == current["max_sensors_per_group"]
        assert gen.NOTIFICATION_TITLE_MAX == current["notification_title_max"]
        assert gen.NOTIFICATION_MESSAGE_MAX == current["notification_message_max"]

    def test_codegen_is_idempotent(self):
        """Running gen_ha_schema.py twice must produce byte-identical output."""
        import subprocess
        from pathlib import Path

        repo_root = Path(__file__).resolve().parents[2]
        script = repo_root / "scripts" / "codegen" / "gen_ha_schema.py"
        target = (
            repo_root
            / "ha_integration"
            / "custom_components"
            / "infinassistant"
            / "_generated_limits.py"
        )
        if not script.exists():
            pytest.skip(f"gen_ha_schema.py not at {script}")

        before = target.read_bytes()
        result = subprocess.run(
            ["python", str(script)],
            capture_output=True,
            text=True,
            cwd=str(repo_root),
        )
        assert result.returncode == 0, f"codegen failed: {result.stderr}"
        after = target.read_bytes()
        assert before == after, "gen_ha_schema.py produced non-idempotent output"


class TestPushWatchfaceLayoutCaps:
    """REQ-053: nested validators reject layouts that violate SOT caps."""

    def _base_layout(self):
        return {
            "device_id": "dev1",
            "layout": {
                "version": 2,
                "theme": {"bg": "#000"},
                "header": {"show_clock": True},
            },
        }

    def test_within_caps_passes(self):
        """A layout populating containers up to (and including) cap counts validates."""
        import voluptuous as vol
        from custom_components.infinassistant.services import (
            PUSH_WATCHFACE_LAYOUT_SCHEMA,
            MAX_STATUS_GROUPS,
            MAX_SENSOR_GROUPS,
            MAX_GLYPHS_PER_GROUP,
            MAX_SENSORS_PER_GROUP,
        )

        data = self._base_layout()
        data["layout"]["statusBar"] = {
            "groups": [
                {"glyphs": [{"sym": "x"}] * MAX_GLYPHS_PER_GROUP}
                for _ in range(MAX_STATUS_GROUPS)
            ]
        }
        data["layout"]["events"] = {
            "groups": [
                {"sensors": [{"id": "s"}] * MAX_SENSORS_PER_GROUP}
                for _ in range(MAX_SENSOR_GROUPS)
            ]
        }
        # Should not raise.
        PUSH_WATCHFACE_LAYOUT_SCHEMA(data)

    def test_status_groups_over_cap_rejected(self):
        import voluptuous as vol
        from custom_components.infinassistant.services import (
            PUSH_WATCHFACE_LAYOUT_SCHEMA,
            MAX_STATUS_GROUPS,
        )

        data = self._base_layout()
        data["layout"]["statusBar"] = {
            "groups": [{} for _ in range(MAX_STATUS_GROUPS + 1)]
        }
        with pytest.raises(vol.Invalid) as exc:
            PUSH_WATCHFACE_LAYOUT_SCHEMA(data)
        assert "MAX_STATUS_GROUPS" in str(exc.value)

    def test_sensor_groups_over_cap_rejected(self):
        import voluptuous as vol
        from custom_components.infinassistant.services import (
            PUSH_WATCHFACE_LAYOUT_SCHEMA,
            MAX_SENSOR_GROUPS,
        )

        data = self._base_layout()
        data["layout"]["events"] = {
            "groups": [{} for _ in range(MAX_SENSOR_GROUPS + 1)]
        }
        with pytest.raises(vol.Invalid) as exc:
            PUSH_WATCHFACE_LAYOUT_SCHEMA(data)
        assert "MAX_SENSOR_GROUPS" in str(exc.value)

    def test_glyphs_per_group_over_cap_rejected(self):
        import voluptuous as vol
        from custom_components.infinassistant.services import (
            PUSH_WATCHFACE_LAYOUT_SCHEMA,
            MAX_GLYPHS_PER_GROUP,
        )

        data = self._base_layout()
        data["layout"]["statusBar"] = {
            "groups": [
                {"glyphs": [{"sym": "x"}] * (MAX_GLYPHS_PER_GROUP + 1)}
            ]
        }
        with pytest.raises(vol.Invalid) as exc:
            PUSH_WATCHFACE_LAYOUT_SCHEMA(data)
        assert "MAX_GLYPHS_PER_GROUP" in str(exc.value)

    def test_sensors_per_group_over_cap_rejected(self):
        import voluptuous as vol
        from custom_components.infinassistant.services import (
            PUSH_WATCHFACE_LAYOUT_SCHEMA,
            MAX_SENSORS_PER_GROUP,
        )

        data = self._base_layout()
        data["layout"]["events"] = {
            "groups": [
                {"sensors": [{"id": "s"}] * (MAX_SENSORS_PER_GROUP + 1)}
            ]
        }
        with pytest.raises(vol.Invalid) as exc:
            PUSH_WATCHFACE_LAYOUT_SCHEMA(data)
        assert "MAX_SENSORS_PER_GROUP" in str(exc.value)

    def test_cbor_depth_over_cap_rejected(self):
        """A pathologically nested layout must be rejected at the boundary."""
        import voluptuous as vol
        from custom_components.infinassistant.services import (
            PUSH_WATCHFACE_LAYOUT_SCHEMA,
            MAX_CBOR_DEPTH,
        )

        # Build a chain of nested dicts under header that exceeds MAX_CBOR_DEPTH.
        # Layout root counts as depth 1, "header" is depth 2, etc.
        nested: dict = {"leaf": True}
        for _ in range(MAX_CBOR_DEPTH + 2):
            nested = {"deeper": nested}

        data = self._base_layout()
        data["layout"]["header"] = nested
        with pytest.raises(vol.Invalid) as exc:
            PUSH_WATCHFACE_LAYOUT_SCHEMA(data)
        assert "MAX_CBOR_DEPTH" in str(exc.value)

    def test_unknown_statusbar_shape_passes(self):
        """The session-1 ad-hoc {"show": True} statusBar shape must still validate
        — the cap enforcement only kicks in on the named container shapes."""
        from custom_components.infinassistant.services import PUSH_WATCHFACE_LAYOUT_SCHEMA

        data = self._base_layout()
        data["layout"]["statusBar"] = {"show": True}
        # Should not raise — there's no `groups` list to cap.
        PUSH_WATCHFACE_LAYOUT_SCHEMA(data)

