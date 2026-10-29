"""Services for InfinAssistant integration."""
import logging
from typing import Any
import voluptuous as vol
from datetime import datetime
from homeassistant.core import HomeAssistant, ServiceCall, ServiceResponse, SupportsResponse
from homeassistant.exceptions import ServiceValidationError
import homeassistant.helpers.config_validation as cv
from homeassistant.helpers import device_registry as dr

from .const import DOMAIN
from .device_id import normalize_device_id

# REQ-053 — SOT-bound caps generated from scripts/config/firmware-limits.yaml
# by scripts/codegen/gen_ha_schema.py. Editing _generated_limits.py directly
# is forbidden; rerun the codegen after any YAML edit. NOTIFICATION_* keep
# their old names so existing test imports still work — they now derive
# from the same SOT entry as the firmware/Android consumers.
from ._generated_limits import (
    MAX_CBOR_DEPTH,
    MAX_GLYPHS_PER_GROUP,
    MAX_REASSEMBLY_SIZE,
    MAX_SENSORS_PER_GROUP,
    MAX_SENSOR_GROUPS,
    MAX_STATUS_GROUPS,
    NOTIFICATION_MESSAGE_MAX,
    NOTIFICATION_TITLE_MAX,
)

_LOGGER = logging.getLogger(__name__)

# Service names
SERVICE_SEND_NOTIFICATION = "send_notification"
SERVICE_TRIGGER_VIBRATION = "trigger_vibration"
SERVICE_SET_ALARM = "set_alarm"
SERVICE_PUSH_WATCHFACE_LAYOUT = "push_watchface_layout"
SERVICE_GET_WATCHFACE = "get_watchface"


def _measure_depth(value: Any, current_depth: int = 0) -> int:
    """Return the deepest container nesting inside ``value``.

    Counts the value itself as one level — a flat dict has depth 1, a dict
    whose values are dicts has depth 2, and so on. Used by REQ-053's
    MAX_CBOR_DEPTH enforcement so the firmware decoder never receives a
    payload whose nesting it would refuse mid-stream.
    """
    if isinstance(value, dict):
        if not value:
            return current_depth + 1
        return max(_measure_depth(v, current_depth + 1) for v in value.values())
    if isinstance(value, list):
        if not value:
            return current_depth + 1
        return max(_measure_depth(v, current_depth + 1) for v in value)
    return current_depth


def _check_layout_caps(layout: dict) -> dict:
    """Enforce REQ-053 SOT-bound caps on the watchface layout payload.

    Recursive structural caps are applied WHERE the structure is identifiable
    (statusBar.groups[].glyphs, events.groups[].sensors). Top-level CBOR
    nesting depth is enforced unconditionally against MAX_CBOR_DEPTH so even
    legacy v1 layouts that omit the named containers are still bounded.

    Pass-through behavior for shapes that don't match is intentional: the
    legacy v1 layout (tiles/actions) and ad-hoc statusBar shapes from older
    test fixtures must keep validating; only the firmware-known containers
    get strict caps.
    """
    depth = _measure_depth(layout)
    if depth > MAX_CBOR_DEPTH:
        raise vol.Invalid(
            f"layout nesting depth {depth} exceeds MAX_CBOR_DEPTH={MAX_CBOR_DEPTH}"
        )

    status_bar = layout.get("statusBar")
    if isinstance(status_bar, dict):
        groups = status_bar.get("groups")
        if isinstance(groups, list):
            if len(groups) > MAX_STATUS_GROUPS:
                raise vol.Invalid(
                    f"statusBar.groups count {len(groups)} exceeds "
                    f"MAX_STATUS_GROUPS={MAX_STATUS_GROUPS}"
                )
            for i, g in enumerate(groups):
                if not isinstance(g, dict):
                    continue
                glyphs = g.get("glyphs")
                if isinstance(glyphs, list) and len(glyphs) > MAX_GLYPHS_PER_GROUP:
                    raise vol.Invalid(
                        f"statusBar.groups[{i}].glyphs count {len(glyphs)} "
                        f"exceeds MAX_GLYPHS_PER_GROUP={MAX_GLYPHS_PER_GROUP}"
                    )

    events = layout.get("events")
    if isinstance(events, dict):
        groups = events.get("groups")
        if isinstance(groups, list):
            if len(groups) > MAX_SENSOR_GROUPS:
                raise vol.Invalid(
                    f"events.groups count {len(groups)} exceeds "
                    f"MAX_SENSOR_GROUPS={MAX_SENSOR_GROUPS}"
                )
            for i, g in enumerate(groups):
                if not isinstance(g, dict):
                    continue
                sensors = g.get("sensors")
                if isinstance(sensors, list) and len(sensors) > MAX_SENSORS_PER_GROUP:
                    raise vol.Invalid(
                        f"events.groups[{i}].sensors count {len(sensors)} "
                        f"exceeds MAX_SENSORS_PER_GROUP={MAX_SENSORS_PER_GROUP}"
                    )

    # REQ-069 — quick_controls screens are limited to 4 tiles (2x2 grid).
    # Screen type may be expressed as int 3 or string "quick_controls".
    _QUICK_CONTROLS_SCREEN_TYPES = {3, "3", "quick_controls"}
    screens = layout.get("screens")
    if isinstance(screens, list):
        for i, screen in enumerate(screens):
            if not isinstance(screen, dict):
                continue
            st = screen.get("screenType")
            if st in _QUICK_CONTROLS_SCREEN_TYPES:
                tiles = screen.get("tiles", [])
                if isinstance(tiles, list) and len(tiles) > 4:
                    raise vol.Invalid(
                        f"screens[{i}] (quick_controls) has {len(tiles)} tiles; "
                        "maximum is 4 (2×2 grid)."
                    )

    return layout

# Service schemas — all top-level schemas use extra=vol.PREVENT_EXTRA
SEND_NOTIFICATION_SCHEMA = vol.Schema(
    {
        vol.Required("title"): vol.All(cv.string, vol.Length(max=NOTIFICATION_TITLE_MAX)),
        vol.Required("message"): vol.All(cv.string, vol.Length(max=NOTIFICATION_MESSAGE_MAX)),
        vol.Optional("severity", default="info"): vol.In(["info", "warn", "critical"]),
        vol.Optional("device_id"): cv.string,
    },
    extra=vol.PREVENT_EXTRA,
)

TRIGGER_VIBRATION_SCHEMA = vol.Schema(
    {
        vol.Optional("duration_ms", default=500): vol.All(vol.Coerce(int), vol.Range(min=100, max=5000)),
        vol.Optional("pattern", default="short"): vol.In(["short", "long", "double", "triple"]),
        vol.Optional("device_id"): cv.string,
    },
    extra=vol.PREVENT_EXTRA,
)

SET_ALARM_SCHEMA = vol.Schema(
    {
        vol.Required("hour"): vol.All(vol.Coerce(int), vol.Range(min=0, max=23)),
        vol.Required("minute"): vol.All(vol.Coerce(int), vol.Range(min=0, max=59)),
        vol.Optional("enabled", default=True): cv.boolean,
        vol.Optional("days", default=[]): vol.All(cv.ensure_list, [vol.In(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])]),
        vol.Optional("device_id"): cv.string,
    },
    extra=vol.PREVENT_EXTRA,
)

PUSH_WATCHFACE_LAYOUT_SCHEMA = vol.Schema(
    {
        vol.Required("device_id"): cv.string,
        vol.Required("layout"): vol.All(
            vol.Schema({
                vol.Required("version"): vol.Coerce(int),
                vol.Required("theme"): dict,
                vol.Required("header"): dict,
                vol.Optional("statusBar"): dict,
                vol.Optional("events"): dict,
                vol.Optional("screens"): list,
                # v2 global tile color fields
                vol.Optional("defaultActiveColor"): cv.string,
                vol.Optional("defaultInactiveColor"): cv.string,
                # v2 standalone app configs
                vol.Optional("logbookApp"): dict,
                vol.Optional("homeControl"): dict,
                # v1 deprecated fields (backward compat)
                vol.Optional("tiles"): list,
                vol.Optional("actions"): list,
            }, extra=vol.PREVENT_EXTRA),
            # REQ-053 — SOT-bound cap enforcement against firmware-limits.yaml.
            _check_layout_caps,
        ),
    },
    extra=vol.PREVENT_EXTRA,
)

GET_WATCHFACE_SCHEMA = vol.Schema(
    {
        vol.Required("device_id"): cv.string,
    },
    extra=vol.PREVENT_EXTRA,
)


async def _resolve_coordinator(hass, device_id_or_registry_id):
    """Resolve a device_id or HA registry ID to a coordinator and custom device_id.

    Resolution order:
      1. HA device registry lookup (standard HA approach, handles HA UUIDs)
      2. Custom device_id match (backward compatibility, handles MAC addresses)
      3. If no device_id provided and only one coordinator exists, return it
    Raises ServiceValidationError on ambiguity or not found.
    """
    domain_data = hass.data.get(DOMAIN, {})

    # If no device_id given, try single-device shortcut
    if device_id_or_registry_id is None:
        coordinators = [
            (eid, ed) for eid, ed in domain_data.items()
            if isinstance(ed, dict) and "coordinator" in ed
        ]
        if len(coordinators) == 1:
            entry_id, entry_data = coordinators[0]
            _LOGGER.debug(
                "No device_id specified; using single configured device: %s",
                entry_data.get("device_id"),
            )
            return entry_data["coordinator"], entry_data.get("device_id")
        if len(coordinators) > 1:
            raise ServiceValidationError(
                "Multiple devices configured. Please specify device_id."
            )
        raise ServiceValidationError("No InfinAssistant devices configured.")

    # 1. Try HA device registry first (preferred, standard HA approach)
    device_registry = dr.async_get(hass)
    device = device_registry.async_get(device_id_or_registry_id)
    if device:
        for entry_id in device.config_entries:
            entry_data = domain_data.get(entry_id)
            if isinstance(entry_data, dict) and "coordinator" in entry_data:
                _LOGGER.debug(
                    "Resolved device via HA registry: %s -> coordinator for %s",
                    device_id_or_registry_id,
                    entry_data.get("device_id"),
                )
                return entry_data["coordinator"], entry_data.get("device_id")

    # 2. Fall back to custom device_id match (backward compatibility). Both sides are
    # normalized, so a card or app that sends a raw MAC such as ``AA:BB:CC:DD:EE:FF``
    # reaches an entry stored as ``aabbccddeeff`` (and the reverse).
    wanted = normalize_device_id(device_id_or_registry_id)
    for entry_data in domain_data.values():
        if (
            isinstance(entry_data, dict)
            and wanted
            and normalize_device_id(entry_data.get("device_id")) == wanted
        ):
            coordinator = entry_data.get("coordinator")
            if coordinator:
                _LOGGER.debug(
                    "Resolved device via custom device_id: %s",
                    device_id_or_registry_id,
                )
                return coordinator, entry_data.get("device_id")

    raise ServiceValidationError(
        f"Device not found: {device_id_or_registry_id}"
    )


async def async_setup_services(hass: HomeAssistant) -> None:
    """Set up services for InfinAssistant integration."""

    async def handle_send_notification(call: ServiceCall) -> None:
        """Handle send notification service."""
        device_id = call.data.get("device_id")
        _LOGGER.debug("Service %s called with data: %s", SERVICE_SEND_NOTIFICATION, call.data)

        # Fire event that Android app will listen for via WebSocket
        hass.bus.async_fire(f"{DOMAIN}_command", {
            "command": "notify",
            "data": {
                "title": call.data["title"],
                "message": call.data["message"],
                "severity": call.data["severity"],
                "device_id": device_id,
            },
        })

        _LOGGER.info(
            "Notification queued for device %s: title='%s', severity='%s'",
            device_id or "(all)",
            call.data["title"],
            call.data["severity"],
        )

    async def handle_trigger_vibration(call: ServiceCall) -> None:
        """Handle trigger vibration service."""
        device_id = call.data.get("device_id")
        _LOGGER.debug("Service %s called with data: %s", SERVICE_TRIGGER_VIBRATION, call.data)

        # Fire event that Android app will listen for via WebSocket
        hass.bus.async_fire(f"{DOMAIN}_command", {
            "command": "vibrate",
            "data": {
                "duration_ms": call.data["duration_ms"],
                "pattern": call.data["pattern"],
                "device_id": device_id,
            },
        })

        _LOGGER.info(
            "Vibration queued for device %s: pattern='%s', duration=%d ms",
            device_id or "(all)",
            call.data["pattern"],
            call.data["duration_ms"],
        )

    async def handle_set_alarm(call: ServiceCall) -> None:
        """Handle set alarm service."""
        device_id = call.data.get("device_id")
        _LOGGER.debug("Service %s called with data: %s", SERVICE_SET_ALARM, call.data)

        # Fire event that Android app will listen for via WebSocket
        hass.bus.async_fire(f"{DOMAIN}_command", {
            "command": "set_alarm",
            "data": {
                "hour": call.data["hour"],
                "minute": call.data["minute"],
                "enabled": call.data["enabled"],
                "days": call.data["days"],
                "device_id": device_id,
            },
        })

        _LOGGER.info(
            "Alarm queued for device %s: %02d:%02d, enabled=%s, days=%s",
            device_id or "(all)",
            call.data["hour"],
            call.data["minute"],
            call.data["enabled"],
            call.data["days"],
        )

    async def handle_push_watchface_layout(call: ServiceCall) -> None:
        """Handle push watchface layout service."""
        _LOGGER.debug("Service %s called with data: %s", SERVICE_PUSH_WATCHFACE_LAYOUT, call.data)

        device_id_or_registry_id = call.data["device_id"]
        layout = call.data["layout"]

        # Validate required fields (format-aware: v1 uses tiles+actions, v2 uses screens)
        required_always = ["version", "theme", "header"]
        has_v1 = "tiles" in layout and "actions" in layout
        has_v2 = "screens" in layout

        missing_always = [f for f in required_always if f not in layout]
        if missing_always:
            raise ServiceValidationError(
                f"Missing required fields in layout: {', '.join(missing_always)}"
            )
        if not has_v1 and not has_v2:
            raise ServiceValidationError(
                "Layout must contain either 'tiles' and 'actions' (v1) or 'screens' (v2)"
            )

        # _resolve_coordinator raises ServiceValidationError on failure
        coordinator, custom_device_id = await _resolve_coordinator(hass, device_id_or_registry_id)

        # Store layout in coordinator
        await coordinator.set_watchface_layout(custom_device_id, layout)

        # Fire event that Android app will listen for
        hass.bus.async_fire("infinassistant_watchface_layout_changed", {
            "device_id": device_id_or_registry_id,  # Use original ID for event (Android expects HA UUID)
            "layout": layout,
            "timestamp": datetime.now().isoformat(),
        })

        _LOGGER.info(
            "Watch face layout pushed for device %s (event fired, version=%s, screens=%d, tiles=%d, actions=%d)",
            custom_device_id,
            layout.get("version"),
            len(layout.get("screens", [])),
            len(layout.get("tiles", [])),
            len(layout.get("actions", [])),
        )

    async def handle_get_watchface(call: ServiceCall) -> ServiceResponse:
        """Handle get watchface service."""
        _LOGGER.debug("Service %s called with data: %s", SERVICE_GET_WATCHFACE, call.data)

        device_id_or_registry_id = call.data["device_id"]

        # _resolve_coordinator raises ServiceValidationError on failure
        coordinator, custom_device_id = await _resolve_coordinator(hass, device_id_or_registry_id)

        # Get layout from coordinator using the custom device_id
        layout = coordinator.get_watchface_layout(custom_device_id)

        if not layout:
            raise ServiceValidationError(
                f"No watchface layout configured for device_id: {custom_device_id}"
            )

        _LOGGER.info("Retrieved watch face layout for device %s (version=%s)", custom_device_id, layout.get("version"))

        return {"layout": layout}

    # Register services with error handling
    try:
        hass.services.async_register(
            DOMAIN,
            SERVICE_SEND_NOTIFICATION,
            handle_send_notification,
            schema=SEND_NOTIFICATION_SCHEMA,
        )
        _LOGGER.debug("Registered service: %s", SERVICE_SEND_NOTIFICATION)
    except Exception as err:
        _LOGGER.error("Failed to register service %s: %s", SERVICE_SEND_NOTIFICATION, err)

    try:
        hass.services.async_register(
            DOMAIN,
            SERVICE_TRIGGER_VIBRATION,
            handle_trigger_vibration,
            schema=TRIGGER_VIBRATION_SCHEMA,
        )
        _LOGGER.debug("Registered service: %s", SERVICE_TRIGGER_VIBRATION)
    except Exception as err:
        _LOGGER.error("Failed to register service %s: %s", SERVICE_TRIGGER_VIBRATION, err)

    try:
        hass.services.async_register(
            DOMAIN,
            SERVICE_SET_ALARM,
            handle_set_alarm,
            schema=SET_ALARM_SCHEMA,
        )
        _LOGGER.debug("Registered service: %s", SERVICE_SET_ALARM)
    except Exception as err:
        _LOGGER.error("Failed to register service %s: %s", SERVICE_SET_ALARM, err)

    try:
        hass.services.async_register(
            DOMAIN,
            SERVICE_PUSH_WATCHFACE_LAYOUT,
            handle_push_watchface_layout,
            schema=PUSH_WATCHFACE_LAYOUT_SCHEMA,
        )
        _LOGGER.debug("Registered service: %s", SERVICE_PUSH_WATCHFACE_LAYOUT)
    except Exception as err:
        _LOGGER.error("Failed to register service %s: %s", SERVICE_PUSH_WATCHFACE_LAYOUT, err)

    # Check if SupportsResponse is available (HA 2023.7+)
    try:
        hass.services.async_register(
            DOMAIN,
            SERVICE_GET_WATCHFACE,
            handle_get_watchface,
            schema=GET_WATCHFACE_SCHEMA,
            supports_response=SupportsResponse.ONLY,
        )
        _LOGGER.debug("Registered service: %s (with response support)", SERVICE_GET_WATCHFACE)
    except TypeError:
        # Fallback for older HA versions without supports_response parameter
        _LOGGER.warning("supports_response not available, registering %s without it", SERVICE_GET_WATCHFACE)
        try:
            hass.services.async_register(
                DOMAIN,
                SERVICE_GET_WATCHFACE,
                handle_get_watchface,
                schema=GET_WATCHFACE_SCHEMA,
            )
            _LOGGER.debug("Registered service: %s (legacy mode)", SERVICE_GET_WATCHFACE)
        except Exception as err:
            _LOGGER.error("Failed to register service %s: %s", SERVICE_GET_WATCHFACE, err)
    except Exception as err:
        _LOGGER.error("Failed to register service %s: %s", SERVICE_GET_WATCHFACE, err)

    _LOGGER.info("InfinAssistant services registered successfully")


async def async_unload_services(hass: HomeAssistant) -> None:
    """Unload services for InfinAssistant integration."""
    services_to_remove = [
        SERVICE_SEND_NOTIFICATION,
        SERVICE_TRIGGER_VIBRATION,
        SERVICE_SET_ALARM,
        SERVICE_PUSH_WATCHFACE_LAYOUT,
        SERVICE_GET_WATCHFACE,
    ]

    for service in services_to_remove:
        if hass.services.has_service(DOMAIN, service):
            hass.services.async_remove(DOMAIN, service)

    _LOGGER.info("InfinAssistant services unloaded")
