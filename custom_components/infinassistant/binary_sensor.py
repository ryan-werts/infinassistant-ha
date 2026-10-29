"""Binary sensor platform for InfinAssistant integration."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.util import dt as dt_util

from .const import (
    CONF_CONNECTED_THRESHOLD,
    CONF_DEVICE_ID,
    DEFAULT_CONNECTED_THRESHOLD,
    DOMAIN,
)

UTC = timezone.utc
from .coordinator import InfinassistantDataCoordinator

_LOGGER = logging.getLogger(__name__)

# Binary sensor type configuration
# Maps internal key -> (name, device_class, data_key)
BINARY_SENSOR_CONFIGS: dict[str, dict[str, Any]] = {
    "connected": {
        "name": "Connected",
        "device_class": BinarySensorDeviceClass.CONNECTIVITY,
        "key": "connected",
    },
    "battery_charging": {
        "name": "Battery Charging",
        "device_class": BinarySensorDeviceClass.BATTERY_CHARGING,
        "key": "battery_charging",
    },
}


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up InfinAssistant binary sensors based on a config entry."""
    coordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]
    device_id = entry.data[CONF_DEVICE_ID]

    entities = [
        InfinassistantBinarySensor(coordinator, entry, device_id, sensor_type, config)
        for sensor_type, config in BINARY_SENSOR_CONFIGS.items()
    ]

    async_add_entities(entities)
    _LOGGER.debug("Added %d binary sensors for device %s", len(entities), device_id)


class InfinassistantBinarySensor(CoordinatorEntity, BinarySensorEntity):
    """Representation of an InfinAssistant binary sensor."""

    def __init__(
        self,
        coordinator: InfinassistantDataCoordinator,
        entry: ConfigEntry,
        device_id: str,
        sensor_type: str,
        config: dict[str, Any],
    ) -> None:
        """Initialize the binary sensor.

        Args:
            coordinator: Data update coordinator
            entry: Config entry
            device_id: Unique device identifier (MAC address)
            sensor_type: Type of binary sensor (connected, battery_charging)
            config: Sensor configuration dict with name, device_class, key
        """
        super().__init__(coordinator)
        self._sensor_type = sensor_type
        self._device_id = device_id
        self._data_key = config["key"]
        # Keep the entry so the staleness window is read live. Caching it here
        # would freeze the value at setup: the options flow does not reload the
        # entry (only rotate_key does), so a changed threshold would not take
        # effect until a restart.
        self._entry = entry
        self._attr_has_entity_name = True
        self._attr_entity_registry_enabled_default = True

        # Set unique ID
        self._attr_unique_id = f"{device_id}_{sensor_type}"

        # Set name
        self._attr_name = config["name"]

        # Set device class
        self._attr_device_class = config["device_class"]

        _LOGGER.debug(
            "Initialized binary sensor %s for device %s",
            sensor_type,
            device_id,
        )

    @property
    def device_info(self) -> dict[str, Any]:
        """Return device information about this entity."""
        return {
            "identifiers": {(DOMAIN, self._device_id)},
            "name": f"PineTime {self._device_id}",
            "manufacturer": "Pine64",
            "model": "PineTime",
            "sw_version": "InfiniTime",
        }

    @property
    def is_on(self) -> bool | None:
        """Return true if the binary sensor is on."""
        if self.coordinator.data is None:
            return None

        if self._sensor_type == "connected":
            last_sync = self.coordinator.data.get("last_sync")
            if last_sync is None:
                return None
            # The coordinator stores last_sync as an aware datetime
            # (dt_util.utcnow() / dt_util.utc_from_timestamp), so it must not be
            # parsed as a string. Accept an ISO string too, in case a restored
            # or externally-written value arrives in that form.
            if isinstance(last_sync, str):
                try:
                    last_sync = dt_util.parse_datetime(last_sync)
                except (ValueError, TypeError):
                    return None
            if not isinstance(last_sync, datetime):
                return None
            if last_sync.tzinfo is None:
                last_sync = last_sync.replace(tzinfo=UTC)

            threshold = self._entry.options.get(
                CONF_CONNECTED_THRESHOLD, DEFAULT_CONNECTED_THRESHOLD
            )
            age_seconds = (dt_util.utcnow() - last_sync).total_seconds()
            is_connected = age_seconds < threshold
            _LOGGER.debug(
                "Binary sensor %s is_on: %s (last_sync age: %.0fs, threshold: %ds)",
                self._sensor_type,
                is_connected,
                age_seconds,
                threshold,
            )
            return is_connected

        value = self.coordinator.data.get(self._data_key)

        _LOGGER.debug(
            "Binary sensor %s is_on: %s",
            self._sensor_type,
            value,
        )

        if value is None:
            return None
        return bool(value)

    @property
    def available(self) -> bool:
        """Return if entity is available."""
        # Entity is available if we have received data from the coordinator
        return (
            self.coordinator.last_update_success
            and self.coordinator.data is not None
            and self.coordinator.data.get("last_sync") is not None
        )
