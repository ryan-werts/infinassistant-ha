"""Device action platform for InfinAssistant integration."""
from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import Context, HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.typing import ConfigType, TemplateVarsType

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

# Action type constants
ACTION_PING_WATCH = "ping_watch"
ACTION_RESYNC = "resync"
ACTION_SEND_TEST_NOTIFICATION = "send_test_notification"

ACTION_TYPES = {
    ACTION_PING_WATCH,
    ACTION_RESYNC,
    ACTION_SEND_TEST_NOTIFICATION,
}

# cv.DEVICE_ACTION_BASE_SCHEMA carries the `metadata` key that the UI writes
# into every stored device action. A bare vol.Schema defaults to PREVENT_EXTRA
# and therefore rejects any UI-authored action.
ACTION_SCHEMA = cv.DEVICE_ACTION_BASE_SCHEMA.extend(
    {
        vol.Required("domain"): DOMAIN,
        vol.Required("device_id"): cv.string,
        vol.Required("type"): vol.In(ACTION_TYPES),
    }
)


async def async_get_actions(
    hass: HomeAssistant, device_id: str
) -> list[dict[str, Any]]:
    """Return a list of device actions for a given InfinAssistant device.

    Args:
        hass: Home Assistant instance
        device_id: HA device registry identifier
    """
    # Verify the device belongs to this integration
    device_registry = dr.async_get(hass)
    device = device_registry.async_get(device_id)
    if device is None:
        return []

    if not any(
        entry_id in hass.data.get(DOMAIN, {})
        for entry_id in device.config_entries
    ):
        return []

    return [
        {
            "domain": DOMAIN,
            "device_id": device_id,
            "type": action_type,
        }
        for action_type in ACTION_TYPES
    ]


async def async_call_action_from_config(
    hass: HomeAssistant,
    config: ConfigType,
    variables: TemplateVarsType,
    context: Context | None,
) -> None:
    """Execute a device action for an InfinAssistant device.

    Args:
        hass: Home Assistant instance
        config: Action configuration (validated by ACTION_SCHEMA)
        variables: Template variables (unused)
        context: Action context for attribution
    """
    action_type: str = config["type"]
    device_id: str = config["device_id"]

    # Resolve the custom device_id from the HA registry device_id
    custom_device_id = _resolve_custom_device_id(hass, device_id)

    _LOGGER.debug(
        "Executing device action '%s' for device %s (custom_id: %s)",
        action_type,
        device_id,
        custom_device_id,
    )

    if action_type == ACTION_PING_WATCH:
        hass.bus.async_fire(
            f"{DOMAIN}_command",
            {
                "command": "ping",
                "device_id": custom_device_id or device_id,
            },
            context=context,
        )
        _LOGGER.info("Ping sent to device %s", custom_device_id or device_id)

    elif action_type == ACTION_RESYNC:
        hass.bus.async_fire(
            f"{DOMAIN}_command",
            {
                "command": "resync",
                "device_id": custom_device_id or device_id,
            },
            context=context,
        )
        _LOGGER.info("Resync triggered for device %s", custom_device_id or device_id)

    elif action_type == ACTION_SEND_TEST_NOTIFICATION:
        hass.bus.async_fire(
            f"{DOMAIN}_command",
            {
                "command": "notify",
                "data": {
                    "title": "Test Notification",
                    "message": "This is a test notification from Home Assistant.",
                    "severity": "info",
                    "device_id": custom_device_id or device_id,
                },
            },
            context=context,
        )
        _LOGGER.info(
            "Test notification sent to device %s", custom_device_id or device_id
        )

    else:
        raise HomeAssistantError(f"Unknown InfinAssistant device action: {action_type}")


async def async_get_action_capabilities(
    hass: HomeAssistant, config: ConfigType
) -> dict[str, vol.Schema]:
    """Return the capabilities (extra fields) for each action type.

    All current InfinAssistant actions have no extra user-configurable fields.
    """
    return {}


def _resolve_custom_device_id(hass: HomeAssistant, ha_device_id: str) -> str | None:
    """Map an HA device registry ID to the InfinAssistant custom device_id.

    Args:
        hass: Home Assistant instance
        ha_device_id: HA device registry identifier

    Returns:
        The custom device_id string, or None if not found.
    """
    device_registry = dr.async_get(hass)
    device = device_registry.async_get(ha_device_id)
    if device is None:
        return None

    domain_data = hass.data.get(DOMAIN, {})
    for entry_id in device.config_entries:
        entry_data = domain_data.get(entry_id)
        if isinstance(entry_data, dict):
            return entry_data.get("device_id")

    return None
