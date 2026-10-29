"""DataUpdateCoordinator for InfinAssistant integration."""
from __future__ import annotations

import asyncio
from datetime import timedelta
import logging
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.storage import Store
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator
from homeassistant.util import dt as dt_util

from .const import DOMAIN, DEFAULT_CONNECTED_THRESHOLD, DEFAULT_UPDATE_INTERVAL

_LOGGER = logging.getLogger(__name__)

# REQ-051 — Store schema version. Bump only on a backward-incompatible
# layout-dict shape change; minor field additions stay on version 1 with
# defensive .get() reads in load_from_store.
_WATCHFACE_STORE_VERSION = 1


class InfinassistantDataCoordinator(DataUpdateCoordinator):
    """Class to manage fetching InfinAssistant data."""

    def __init__(
        self,
        hass: HomeAssistant,
        device_id: str,
        update_interval: int = DEFAULT_UPDATE_INTERVAL,
        connected_threshold: int = DEFAULT_CONNECTED_THRESHOLD,
    ) -> None:
        """Initialize the data coordinator.

        Args:
            hass: Home Assistant instance
            device_id: Unique device identifier (MAC address)
            update_interval: Polling interval in seconds (default: 300)
        """
        super().__init__(
            hass,
            _LOGGER,
            name=f"{DOMAIN}_{device_id}",
            update_interval=timedelta(seconds=update_interval),
        )
        self.device_id = device_id
        # None until the first report/poll decides, so the first transition
        # always fires rather than being swallowed as "no change".
        self._last_connected: bool | None = None
        self._connected_threshold = connected_threshold
        self.data: dict[str, Any] = {
            "steps": None,
            "heart_rate": None,
            "battery": None,
            "battery_charging": None,
            "motion_state": None,
            "heart_rate_state": None,
            "last_sync": None,
            # REQ-056 — LVGL diagnostic fields (hello_diag_rev=2).
            # Populated from SENSOR_REPORT (lvfs/lvfb/lvfp/lvcf keys) and HELLO
            # (lvFreeSize/lvFreeBiggest/lvFragPct/lvCreateFailures keys).
            # None until first report received; preserved across updates that
            # omit the fields (backward-compat with hello_diag_rev=1 watches).
            "lv_free_size": None,
            "lv_free_biggest": None,
            "lv_frag_pct": None,
            "lv_create_failures": None,
            "hello_diag_rev": None,
            # REQ-064 — safe-face trip counter. Zero on first connect; increments
            # once per false→true safeFaceMode_ transition on the watch.
            "safe_face_trips": None,
        }
        self._watchface_layout: dict | None = None
        self._update_lock = asyncio.Lock()
        # Diagnostic counters: number of out-of-range values discarded per sensor key
        self.range_violation_counts: dict[str, int] = {}
        # REQ-051 — HA-managed JSON store keyed per-device so multiple watches
        # don't trample each other. Constructed lazily so unit-test paths that
        # never persist a layout pay no I/O cost.
        self._store: Store = Store(
            hass,
            _WATCHFACE_STORE_VERSION,
            f"{DOMAIN}_watchface_{device_id}",
        )

    async def update_from_webhook(self, sensor_data: dict[str, Any]) -> None:
        """Update sensor data from webhook payload.

        Serialized via asyncio.Lock to prevent concurrent webhooks from
        causing last-writer-wins data loss.

        Args:
            sensor_data: Dictionary containing sensor values from webhook
                Expected keys: steps, heart_rate, battery_percent,
                battery_charging, motion_state, heart_rate_state, timestamp
        """
        async with self._update_lock:
            # Map webhook keys to internal data keys
            updates: dict[str, Any] = {}

            if "steps" in sensor_data:
                updates["steps"] = sensor_data["steps"]

            if "heart_rate" in sensor_data:
                updates["heart_rate"] = sensor_data["heart_rate"]

            if "battery_percent" in sensor_data:
                updates["battery"] = sensor_data["battery_percent"]

            if "battery_charging" in sensor_data:
                updates["battery_charging"] = sensor_data["battery_charging"]

            if "motion_state" in sensor_data:
                updates["motion_state"] = sensor_data["motion_state"]

            if "heart_rate_state" in sensor_data:
                updates["heart_rate_state"] = sensor_data["heart_rate_state"]

            # REQ-056 — LVGL diag fields from SENSOR_REPORT (compact keys:
            # lvfs/lvfb/lvfp/lvcf) and from HELLO (full keys:
            # lvFreeSize/lvFreeBiggest/lvFragPct/lvCreateFailures).
            # Backward-compat: fields are absent on hello_diag_rev=1 watches;
            # existing None values are left unchanged in that case.
            for compact_key, full_key, internal_key in (
                ("lvfs", "lvFreeSize",       "lv_free_size"),
                ("lvfb", "lvFreeBiggest",    "lv_free_biggest"),
                ("lvfp", "lvFragPct",        "lv_frag_pct"),
                ("lvcf", "lvCreateFailures", "lv_create_failures"),
            ):
                if compact_key in sensor_data:
                    updates[internal_key] = sensor_data[compact_key]
                elif full_key in sensor_data:
                    updates[internal_key] = sensor_data[full_key]

            if "helloDiagRev" in sensor_data:
                updates["hello_diag_rev"] = sensor_data["helloDiagRev"]

            # REQ-064 — safe-face trip counter from HELLO.
            if "safeFaceTrips" in sensor_data:
                updates["safe_face_trips"] = sensor_data["safeFaceTrips"]

            # Update last sync timestamp
            if "timestamp" in sensor_data:
                # Convert Unix timestamp (ms) to timezone-aware datetime
                updates["last_sync"] = dt_util.utc_from_timestamp(
                    sensor_data["timestamp"] / 1000
                )
            else:
                updates["last_sync"] = dt_util.utcnow()

            # Merge updates into existing data
            self.data.update(updates)

            _LOGGER.debug(
                "Updated sensor data for %s: %s",
                self.device_id,
                {k: v for k, v in updates.items() if k != "last_sync"},
            )

            # A report arriving means the watch is reachable. Fire the
            # connectivity event the device triggers listen for — previously
            # nothing in the integration emitted it, so all three device
            # triggers were dead.
            self._fire_connectivity_event(connected=True)

            # REQ-052 — publish a shallow copy so listeners that retain the
            # reference do not observe later in-place mutations of self.data.
            # The internal store stays self.data (mutated by the next update);
            # subscribers receive their own dict to inspect at leisure.
            self.async_set_updated_data(dict(self.data))

    async def _async_update_data(self) -> dict[str, Any]:
        """Fetch data from the coordinator.

        This is called periodically by the DataUpdateCoordinator base class.
        Since we rely on webhook pushes, this just returns the current data.

        If last_sync is None (first update), set it to current time so sensors
        become available immediately after setup.

        Returns:
            Current sensor data dictionary
        """
        # Staleness check drives infinassistant_disconnected. Without this the
        # only transition ever fired would be "connected", so a disconnect
        # device-trigger could never run.
        last_sync = self.data.get("last_sync")
        if last_sync is not None:
            age = (dt_util.utcnow() - last_sync).total_seconds()
            self._fire_connectivity_event(connected=age < self._connected_threshold)

        # Initialize last_sync on first update so sensors become available
        if self.data.get("last_sync") is None:
            self.data["last_sync"] = dt_util.utcnow()
            _LOGGER.debug(
                "Initialized coordinator for device %s - sensors now available",
                self.device_id,
            )

        return self.data

    def _fire_connectivity_event(self, *, connected: bool) -> None:
        """Fire infinassistant_connected / infinassistant_disconnected on a change.

        The event carries BOTH identifiers on purpose. device_trigger filters on
        the Home Assistant device-registry id (that is what a device automation
        config stores), while the rest of the integration keys off the watch MAC
        — an event carrying only the MAC could never match the trigger filter.
        """
        if self._last_connected == connected:
            return
        self._last_connected = connected

        registry_id = None
        try:
            device = dr.async_get(self.hass).async_get_device(
                identifiers={(DOMAIN, self.device_id)}
            )
            registry_id = device.id if device else None
        except Exception:  # pragma: no cover - registry unavailable in tests
            registry_id = None

        event = f"{DOMAIN}_connected" if connected else f"{DOMAIN}_disconnected"
        self.hass.bus.async_fire(
            event,
            {
                # device_trigger matches on this one.
                "device_id": registry_id or self.device_id,
                "mac": self.device_id,
            },
        )
        _LOGGER.debug("Fired %s for %s", event, self.device_id)

    def note_disconnected(self) -> None:
        """Record that the watch has gone stale, firing the event once."""
        self._fire_connectivity_event(connected=False)

    def increment_range_violation(self, sensor_key: str) -> None:
        """Increment the out-of-range violation counter for *sensor_key*.

        Args:
            sensor_key: The sensor identifier whose value was discarded.
        """
        self.range_violation_counts[sensor_key] = (
            self.range_violation_counts.get(sensor_key, 0) + 1
        )

    async def set_watchface_layout(self, device_id: str, layout: dict) -> None:
        """Store watch face layout configuration.

        Serialized via asyncio.Lock to prevent concurrent updates.

        REQ-051: also persists to HA's JSON store so a restart restores the
        most recent layout without round-tripping to the Android bridge.

        Args:
            device_id: Device identifier (should match self.device_id)
            layout: Watch face layout configuration dictionary
        """
        async with self._update_lock:
            if device_id != self.device_id:
                _LOGGER.warning(
                    "Attempted to set watchface layout for device %s on coordinator for %s",
                    device_id,
                    self.device_id,
                )
                return

            self._watchface_layout = layout
            try:
                await self._store.async_save(layout)
            except Exception:  # noqa: BLE001 — persistence must not break ingest
                _LOGGER.exception(
                    "Failed to persist watch face layout for device %s; "
                    "in-memory copy retained but next restart will lose it",
                    device_id,
                )
            _LOGGER.info(
                "Stored watch face layout for device %s (version=%s, tiles=%d, actions=%d)",
                device_id,
                layout.get("version"),
                len(layout.get("tiles", [])),
                len(layout.get("actions", [])),
            )

            # REQ-052 — publish a shallow copy so subscribers don't observe
            # later in-place mutations.
            self.async_set_updated_data(dict(self.data))

    async def async_load_persisted_layout(self) -> None:
        """REQ-051 — load the most recent saved layout from disk on setup.

        Called by async_setup_entry after the coordinator is constructed.
        Silent no-op on first install (no prior state). Never raises:
        persistence is best-effort and ingest works without it.
        """
        try:
            saved = await self._store.async_load()
        except Exception:  # noqa: BLE001 — corrupt store must not break setup
            _LOGGER.exception(
                "Failed to load persisted watch face layout for device %s",
                self.device_id,
            )
            return
        if not saved:
            return
        if not isinstance(saved, dict):
            _LOGGER.warning(
                "Discarding persisted watch face layout for device %s: "
                "expected dict, got %s",
                self.device_id,
                type(saved).__name__,
            )
            return
        self._watchface_layout = saved
        _LOGGER.info(
            "Restored persisted watch face layout for device %s (version=%s)",
            self.device_id,
            saved.get("version"),
        )

    def get_watchface_layout(self, device_id: str) -> dict | None:
        """Retrieve stored watch face layout configuration.

        Args:
            device_id: Device identifier (should match self.device_id)

        Returns:
            Watch face layout configuration dictionary, or None if not set
        """
        if device_id != self.device_id:
            _LOGGER.warning(
                "Attempted to get watchface layout for device %s from coordinator for %s",
                device_id,
                self.device_id,
            )
            return None

        return self._watchface_layout
