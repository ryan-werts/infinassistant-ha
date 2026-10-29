"""Device trigger platform for InfinAssistant integration."""
from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant.components.device_automation import DEVICE_TRIGGER_BASE_SCHEMA
from homeassistant.components.homeassistant.triggers import event as event_trigger
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import CALLBACK_TYPE, HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.trigger import TriggerActionType, TriggerInfo
from homeassistant.helpers.typing import ConfigType

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

# Trigger type constants
TRIGGER_WATCH_BUTTON_PRESS = "watch_button_press"
TRIGGER_WATCH_CONNECTED = "watch_connected"
TRIGGER_WATCH_DISCONNECTED = "watch_disconnected"

TRIGGER_TYPES = {
    TRIGGER_WATCH_BUTTON_PRESS,
    TRIGGER_WATCH_CONNECTED,
    TRIGGER_WATCH_DISCONNECTED,
}

# Event fired by the integration for each trigger
_TRIGGER_EVENT_MAP = {
    TRIGGER_WATCH_BUTTON_PRESS: f"{DOMAIN}_action_invoke",
    TRIGGER_WATCH_CONNECTED: f"{DOMAIN}_connected",
    TRIGGER_WATCH_DISCONNECTED: f"{DOMAIN}_disconnected",
}

TRIGGER_SCHEMA = DEVICE_TRIGGER_BASE_SCHEMA.extend(
    {
        vol.Required("type"): vol.In(TRIGGER_TYPES),
    }
)


async def async_get_triggers(
    hass: HomeAssistant, device_id: str
) -> list[dict[str, Any]]:
    """Return a list of triggers for a given InfinAssistant device.

    Args:
        hass: Home Assistant instance
        device_id: HA device registry identifier
    """
    # Verify the device belongs to this integration
    device_registry = dr.async_get(hass)
    device = device_registry.async_get(device_id)
    if device is None:
        return []

    integration_domain = DOMAIN
    if not any(
        entry_id in hass.data.get(integration_domain, {})
        for entry_id in device.config_entries
    ):
        return []

    return [
        {
            "platform": "device",
            "domain": DOMAIN,
            "device_id": device_id,
            "type": trigger_type,
        }
        for trigger_type in TRIGGER_TYPES
    ]


async def async_attach_trigger(
    hass: HomeAssistant,
    config: ConfigType,
    action: TriggerActionType,
    trigger_info: TriggerInfo,
) -> CALLBACK_TYPE:
    """Attach a trigger for an InfinAssistant device event.

    Args:
        hass: Home Assistant instance
        config: Trigger configuration (validated by TRIGGER_SCHEMA)
        action: Callback to invoke when the trigger fires
        trigger_info: Metadata about the trigger (used by HA for logging)
    """
    trigger_type: str = config["type"]
    device_id: str = config["device_id"]

    event_type = _TRIGGER_EVENT_MAP.get(trigger_type)
    if event_type is None:
        _LOGGER.error("Unknown trigger type: %s", trigger_type)
        return lambda: None

    # Build the event trigger config — filter by device_id in event data
    event_config = event_trigger.TRIGGER_SCHEMA(
        {
            "platform": "event",
            "event_type": event_type,
            "event_data": {"device_id": device_id},
        }
    )

    _LOGGER.debug(
        "Attaching device trigger '%s' for device %s (event: %s)",
        trigger_type,
        device_id,
        event_type,
    )

    return await event_trigger.async_attach_trigger(
        hass,
        event_config,
        action,
        trigger_info,
    )


async def async_get_trigger_capabilities(
    hass: HomeAssistant, config: ConfigType
) -> dict[str, vol.Schema]:
    """Return the capabilities of a trigger.

    All InfinAssistant triggers have no extra user-configurable fields beyond
    the base type selector.
    """
    return {}
