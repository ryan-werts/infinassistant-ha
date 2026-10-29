"""Sensor platform for InfinAssistant integration."""
from __future__ import annotations

import logging
from typing import Any

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorEntityDescription,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import EntityCategory
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.network import get_url
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.helpers import entity_registry as er

from .const import CONF_DEVICE_ID, CONF_WEBHOOK_ID, DOMAIN, SENSOR_TYPES
from .coordinator import InfinassistantDataCoordinator

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up InfinAssistant sensor based on a config entry."""
    coordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]
    device_id = entry.data[CONF_DEVICE_ID]
    webhook_id = entry.data[CONF_WEBHOOK_ID]

    # Construct webhook URL
    try:
        ha_url = get_url(hass, prefer_external=False)
    except Exception:
        ha_url = "http://<your-ha-address>:8123"
    webhook_url = f"{ha_url}/api/webhook/{webhook_id}"

    sensors: list[SensorEntity] = [
        InfinassistantSensor(coordinator, entry, device_id, sensor_type, webhook_url)
        for sensor_type in SENSOR_TYPES
    ]

    # FR-HUX-1: Add the diagnostic sensor
    entry_data = hass.data[DOMAIN][entry.entry_id]
    sensors.append(
        InfinassistantDiagnosticSensor(coordinator, entry, device_id, entry_data)
    )

    async_add_entities(sensors)
    _LOGGER.debug("Added %d sensors for device %s", len(sensors), device_id)


class InfinassistantSensor(CoordinatorEntity, SensorEntity):
    """Representation of an InfinAssistant sensor."""

    def __init__(
        self,
        coordinator: InfinassistantDataCoordinator,
        entry: ConfigEntry,
        device_id: str,
        sensor_type: str,
        webhook_url: str,
    ) -> None:
        """Initialize the sensor.

        Args:
            coordinator: Data update coordinator
            entry: Config entry
            device_id: Unique device identifier (MAC address)
            sensor_type: Type of sensor (steps, heart_rate, battery, motion_state)
            webhook_url: Full webhook URL for this device
        """
        super().__init__(coordinator)
        self._sensor_type = sensor_type
        self._device_id = device_id
        self._entry_id = entry.entry_id
        self._webhook_url = webhook_url
        self._attr_has_entity_name = True
        self._attr_entity_registry_enabled_default = True

        # Get sensor configuration
        sensor_config = SENSOR_TYPES[sensor_type]

        # Set unique ID
        self._attr_unique_id = f"{device_id}_{sensor_type}"

        # Set name
        self._attr_name = sensor_config["name"]

        # Set icon
        self._attr_icon = sensor_config["icon"]

        # Set unit of measurement
        self._attr_native_unit_of_measurement = sensor_config.get("unit")

        # Set device class and state class based on sensor type
        if sensor_type == "battery":
            self._attr_device_class = SensorDeviceClass.BATTERY
            self._attr_state_class = SensorStateClass.MEASUREMENT
        elif sensor_type == "heart_rate":
            self._attr_state_class = SensorStateClass.MEASUREMENT
        elif sensor_type == "steps":
            self._attr_state_class = SensorStateClass.MEASUREMENT
        # motion_state and heart_rate_state are text sensors, no device class or state class

        _LOGGER.debug(
            "Initialized sensor %s for device %s",
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
    def native_value(self) -> Any:
        """Return the state of the sensor."""
        if self.coordinator.data is None:
            return None

        value = self.coordinator.data.get(self._sensor_type)

        _LOGGER.debug(
            "Sensor %s native_value: %s",
            self._sensor_type,
            value,
        )

        return value

    @property
    def available(self) -> bool:
        """Return if entity is available."""
        # Entity is available if we have received data from the coordinator
        return (
            self.coordinator.last_update_success
            and self.coordinator.data is not None
            and self.coordinator.data.get("last_sync") is not None
        )

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return additional state attributes."""
        attrs = {}

        # Always show webhook URL as an attribute
        attrs["webhook_url"] = self._webhook_url

        if self.coordinator.data is not None:
            last_sync = self.coordinator.data.get("last_sync")
            if last_sync is not None:
                attrs["last_sync"] = last_sync.isoformat()

        return attrs


class InfinassistantDiagnosticSensor(CoordinatorEntity, SensorEntity):
    """Diagnostic sensor for InfinAssistant integration health metrics.

    Reports last webhook timestamp, HMAC failure count, and rate limit hit count.
    State is 'ok' when failure counts are zero, 'degraded' otherwise.
    """

    _attr_has_entity_name = True
    _attr_entity_category = EntityCategory.DIAGNOSTIC
    _attr_icon = "mdi:information-outline"

    def __init__(
        self,
        coordinator: InfinassistantDataCoordinator,
        entry: ConfigEntry,
        device_id: str,
        entry_data: dict[str, Any],
    ) -> None:
        """Initialize the diagnostic sensor.

        Args:
            coordinator: Data update coordinator
            entry: Config entry
            device_id: Unique device identifier (MAC address)
            entry_data: Full entry data dict from hass.data[DOMAIN][entry_id]
        """
        super().__init__(coordinator)
        self._device_id = device_id
        self._entry_data = entry_data
        self._attr_unique_id = f"{device_id}_diagnostics"
        self._attr_name = "Diagnostics"

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
    def native_value(self) -> str:
        """Return 'ok' or 'degraded' based on failure counters."""
        rate_limiter = self._entry_data.get("rate_limiter")
        failed_sig_count = self._get_hmac_failure_count()
        rate_limit_hits = (
            rate_limiter.consumed_count(self._device_id) if rate_limiter else 0
        )

        if failed_sig_count > 0 or rate_limit_hits > 0:
            return "degraded"
        return "ok"

    def _get_hmac_failure_count(self) -> int:
        """Return the number of recent HMAC failures from the module-level tracker."""
        try:
            from . import _hmac_failures
            hass = self.coordinator.hass
            domain_data = hass.data.get(DOMAIN, {})
            for eid, edata in domain_data.items():
                if isinstance(edata, dict) and edata.get("device_id") == self._device_id:
                    return len(_hmac_failures.get(eid, []))
        except Exception:
            pass
        return 0

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return diagnostic attributes."""
        attrs: dict[str, Any] = {}

        # Last webhook timestamp
        if self.coordinator.data is not None:
            last_sync = self.coordinator.data.get("last_sync")
            if last_sync is not None:
                attrs["last_webhook_timestamp"] = last_sync.isoformat()
            else:
                attrs["last_webhook_timestamp"] = None
        else:
            attrs["last_webhook_timestamp"] = None

        # HMAC failure count
        attrs["failed_signature_count"] = self._get_hmac_failure_count()

        # Rate limit hit count — use consumed_count as a proxy
        rate_limiter = self._entry_data.get("rate_limiter")
        if rate_limiter is not None:
            attrs["rate_limit_hit_count"] = rate_limiter.consumed_count(self._device_id)
        else:
            attrs["rate_limit_hit_count"] = 0

        # Range violation counts from coordinator
        attrs["range_violation_counts"] = dict(
            self.coordinator.range_violation_counts
        )

        return attrs
