"""Config flow for InfinAssistant integration."""
import base64
import json
import logging
import secrets
import time
import uuid
from urllib.parse import urlparse
import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.network import get_url

from .device_id import normalize_device_id
from .const import (
    DOMAIN,
    CONF_DEVICE_ID,
    CONF_WEBHOOK_ID,
    CONF_HMAC_SECRET,
    CONF_HMAC_OLD_SECRET,
    CONF_HMAC_ROTATION_TIME,
    CONF_REPLAY_WINDOW,
    CONF_RATE_LIMIT,
    DEFAULT_REPLAY_WINDOW,
    DEFAULT_RATE_LIMIT,
    CONF_UPDATE_INTERVAL,
    DEFAULT_UPDATE_INTERVAL,
    MIN_UPDATE_INTERVAL,
    MAX_UPDATE_INTERVAL,
    CONF_CONNECTED_THRESHOLD,
    DEFAULT_CONNECTED_THRESHOLD,
    MIN_CONNECTED_THRESHOLD,
    MAX_CONNECTED_THRESHOLD,
    CONF_SENSOR_ENABLED_PREFIX,
    SENSOR_TYPES,
)

_LOGGER = logging.getLogger(__name__)

# Shared with services.py and __init__.py; kept under the old private name for importers.
_normalize_device_id = normalize_device_id


def _generate_hmac_secret() -> str:
    """Return a fresh 32-byte HMAC secret encoded as URL-safe base64."""
    return base64.urlsafe_b64encode(secrets.token_bytes(32)).decode()


def _build_qr_payload(webhook_url: str, hmac_secret_b64: str, device_id: str) -> str:
    """Return the JSON string that should be encoded into a setup QR code.

    The QR content is a compact JSON object:
    ``{"webhook_url": "...", "hmac_secret": "base64...", "device_id": "..."}``
    """
    return json.dumps(
        {
            "webhook_url": webhook_url,
            "hmac_secret": hmac_secret_b64,
            "device_id": device_id,
        },
        separators=(",", ":"),
    )


class InfinassistantConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for InfinAssistant."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        """Handle the initial step."""
        errors = {}

        if user_input is not None:
            # Normalize device ID so case/separator variants resolve to the same
            # unique_id and cannot register as duplicates (REQ-044).
            raw_device_id = user_input[CONF_DEVICE_ID]
            device_id = _normalize_device_id(raw_device_id)
            if not device_id:
                errors[CONF_DEVICE_ID] = "invalid_device_id"
                return self.async_show_form(
                    step_id="user",
                    data_schema=vol.Schema({vol.Required(CONF_DEVICE_ID): cv.string}),
                    errors=errors,
                )

            # Generate unique webhook ID and HMAC secret
            webhook_id = uuid.uuid4().hex
            hmac_secret = _generate_hmac_secret()

            # Get Home Assistant URL
            try:
                ha_url = get_url(self.hass, prefer_external=True)
            except Exception as err:
                _LOGGER.error("Failed to get Home Assistant URL: %s", err)
                ha_url = "http://<your-ha-address>:8123"

            webhook_url = f"{ha_url}/api/webhook/{webhook_id}"

            # Create unique ID based on normalized device ID to prevent duplicates
            await self.async_set_unique_id(device_id)
            self._abort_if_unique_id_configured()

            # Store in context for confirmation step
            self.context["device_id"] = device_id
            self.context["webhook_id"] = webhook_id
            self.context["webhook_url"] = webhook_url
            self.context["hmac_secret"] = hmac_secret
            self.context["ha_url"] = ha_url

            return await self.async_step_confirm_setup()

        data_schema = vol.Schema(
            {
                vol.Required(CONF_DEVICE_ID): cv.string,
            }
        )

        return self.async_show_form(
            step_id="user",
            data_schema=data_schema,
            errors=errors,
            description_placeholders={
                "instructions": (
                    "Enter a device identifier for your PineTime watch "
                    "(e.g., MAC address or friendly name). "
                    "After setup, you'll receive a webhook URL and signing key to "
                    "configure in your Android bridge app."
                )
            },
        )

    async def async_step_confirm_setup(self, user_input=None):
        """Confirm setup and show webhook URL / QR payload to user."""
        device_id = self.context["device_id"]
        webhook_id = self.context["webhook_id"]
        webhook_url = self.context["webhook_url"]
        hmac_secret = self.context["hmac_secret"]
        ha_url = self.context.get("ha_url", webhook_url)

        qr_payload = _build_qr_payload(webhook_url, hmac_secret, device_id)

        # FR-SEC-4: warn when HA URL is HTTP
        https_warning = ""
        if not ha_url.startswith("https://"):
            https_warning = (
                "\n\n**Warning:** Webhook data will be sent unencrypted. "
                "HTTPS is strongly recommended."
            )

        if user_input is not None:
            config_data = {
                CONF_DEVICE_ID: device_id,
                CONF_WEBHOOK_ID: webhook_id,
                CONF_HMAC_SECRET: hmac_secret,
            }

            return self.async_create_entry(
                title=f"PineTime ({device_id})",
                data=config_data,
            )

        return self.async_show_form(
            step_id="confirm_setup",
            description_placeholders={
                "device_id": device_id,
                "webhook_id": webhook_id,
                "webhook_url": webhook_url,
                "hmac_secret": hmac_secret,
                "qr_payload": qr_payload,
                "https_warning": https_warning,
            },
        )

    async def async_step_zeroconf(self, discovery_info):
        """Handle zeroconf discovery."""
        _LOGGER.debug("Discovered InfinAssistant device: %s", discovery_info)

        properties = discovery_info.properties or {}
        webhook_url = properties.get("webhook_url")

        if not webhook_url:
            _LOGGER.warning("No webhook_url found in mDNS TXT record")
            return self.async_abort(reason="no_webhook_url")

        parsed = urlparse(webhook_url)
        path_parts = [p for p in parsed.path.split("/") if p]
        if len(path_parts) >= 3 and path_parts[0] == "api" and path_parts[1] == "webhook":
            webhook_id = path_parts[2]
        else:
            _LOGGER.error("Unexpected webhook URL format: %s", webhook_url)
            return self.async_abort(reason="invalid_webhook_url")

        # Normalize device ID so a zeroconf advertisement that varies casing or
        # MAC separators from the user-flow form never produces a duplicate
        # entry (REQ-044).
        raw_device_id = properties.get("device_id", webhook_id)
        device_id = _normalize_device_id(raw_device_id) or webhook_id

        await self.async_set_unique_id(device_id)
        self._abort_if_unique_id_configured()

        self.context["device_id"] = device_id
        self.context["webhook_id"] = webhook_id
        self.context["webhook_url"] = webhook_url
        self.context["title_placeholders"] = {"name": device_id}

        return await self.async_step_confirm_discovery()

    async def async_step_confirm_discovery(self, user_input=None):
        """Confirm discovery — gate before the QR/manual secret handshake."""
        device_id = self.context["device_id"]
        webhook_url = self.context["webhook_url"]

        if user_input is not None:
            return await self.async_step_confirm_discovery_handshake()

        return self.async_show_form(
            step_id="confirm_discovery",
            description_placeholders={
                "device_id": device_id,
                "webhook_url": webhook_url,
                "instructions": (
                    "A PineTime watch has been discovered on your network. "
                    "Confirm to begin pairing — the next step will show a QR "
                    "code that the bridge app must scan to receive its signing key."
                ),
            },
        )

    async def async_step_confirm_discovery_handshake(self, user_input=None):
        """Show QR/manual HMAC secret; defer entry creation until handshake ack.

        REQ-045 — the prior flow generated a fresh HMAC secret on the HA side
        and immediately created the entry, leaving the bridge with no way to
        learn the secret. The bridge now reads the secret out of the QR (or
        the operator copies it manually) and acknowledges receipt by ticking
        the confirmation box. Until that ack the secret stays in
        ``self.context`` only — abandoning the flow leaks nothing because the
        entry is never persisted.
        """
        device_id = self.context["device_id"]
        webhook_id = self.context["webhook_id"]
        webhook_url = self.context["webhook_url"]

        # Generate the secret once and stash it in context so a back-button
        # or browser refresh on this step does not churn through new secrets
        # (each fresh secret would invalidate any QR the bridge already
        # scanned, forcing the operator to start over).
        hmac_secret = self.context.get("hmac_secret")
        if not hmac_secret:
            hmac_secret = _generate_hmac_secret()
            self.context["hmac_secret"] = hmac_secret

        qr_payload = _build_qr_payload(webhook_url, hmac_secret, device_id)

        if user_input is not None and user_input.get("handshake_confirmed"):
            config_data = {
                CONF_DEVICE_ID: device_id,
                CONF_WEBHOOK_ID: webhook_id,
                CONF_HMAC_SECRET: hmac_secret,
            }
            return self.async_create_entry(
                title=f"PineTime ({device_id})",
                data=config_data,
                description_placeholders={"webhook_url": webhook_url},
            )

        return self.async_show_form(
            step_id="confirm_discovery_handshake",
            data_schema=vol.Schema(
                {
                    vol.Required("handshake_confirmed", default=False): cv.boolean,
                }
            ),
            description_placeholders={
                "device_id": device_id,
                "webhook_url": webhook_url,
                "hmac_secret": hmac_secret,
                "qr_payload": qr_payload,
                "instructions": (
                    "Scan the QR code with the InfinAssistant bridge app (or "
                    "copy the HMAC secret manually). Tick the confirmation "
                    "below once the bridge reports the key was received."
                ),
            },
        )

    async def async_step_import(self, import_config):
        """Import a config entry from configuration.yaml."""
        _LOGGER.warning(
            "Configuration via YAML is deprecated. "
            "Please use the UI to configure InfinAssistant."
        )
        return await self.async_step_user(import_config)

    @staticmethod
    def async_get_options_flow(config_entry):
        """Get the options flow for this handler."""
        return InfinassistantOptionsFlow(config_entry)


class InfinassistantOptionsFlow(config_entries.OptionsFlow):
    """Handle options flow for InfinAssistant integration.

    The flow keeps its entry as ``_entry`` and never touches ``config_entry``.
    Home Assistant 2024.12 made ``config_entry`` a property it fills itself and
    deprecated assigning it; from 2025.12 assigning it raises, so the options
    dialog would not open. Before 2024.12 the property does not exist, so the
    flow cannot rely on it either while hacs.json supports 2024.1.
    """

    def __init__(self, config_entry):
        """Initialise options flow."""
        self._entry = config_entry

    async def async_step_init(self, user_input=None):
        """Show current webhook info and offer settings / key rotation."""
        webhook_id = self._entry.data.get(CONF_WEBHOOK_ID, "unknown")
        device_id = self._entry.data.get(CONF_DEVICE_ID, "unknown")

        try:
            ha_url = get_url(self.hass, prefer_external=True)
        except Exception:
            ha_url = "http://<your-ha-address>:8123"

        webhook_url = f"{ha_url}/api/webhook/{webhook_id}"

        if user_input is not None:
            rotate = user_input.get("rotate_key", False)
            if rotate:
                return await self.async_step_rotate_key()

            # Collect per-sensor enable toggles
            sensor_enabled = {
                sensor_type: user_input.get(
                    f"{CONF_SENSOR_ENABLED_PREFIX}{sensor_type}", True
                )
                for sensor_type in SENSOR_TYPES
            }

            # Save all configurable options
            options: dict = {
                CONF_RATE_LIMIT: user_input.get(CONF_RATE_LIMIT, DEFAULT_RATE_LIMIT),
                CONF_REPLAY_WINDOW: user_input.get(CONF_REPLAY_WINDOW, DEFAULT_REPLAY_WINDOW),
                CONF_UPDATE_INTERVAL: user_input.get(CONF_UPDATE_INTERVAL, DEFAULT_UPDATE_INTERVAL),
                CONF_CONNECTED_THRESHOLD: user_input.get(CONF_CONNECTED_THRESHOLD, DEFAULT_CONNECTED_THRESHOLD),
            }
            options.update({
                f"{CONF_SENSOR_ENABLED_PREFIX}{k}": v
                for k, v in sensor_enabled.items()
            })

            return self.async_create_entry(title="", data=options)

        current_rate_limit = self._entry.options.get(CONF_RATE_LIMIT, DEFAULT_RATE_LIMIT)
        current_replay_window = self._entry.options.get(CONF_REPLAY_WINDOW, DEFAULT_REPLAY_WINDOW)
        current_update_interval = self._entry.options.get(CONF_UPDATE_INTERVAL, DEFAULT_UPDATE_INTERVAL)
        current_connected_threshold = self._entry.options.get(CONF_CONNECTED_THRESHOLD, DEFAULT_CONNECTED_THRESHOLD)

        # Build per-sensor toggle schema entries
        sensor_schema_fields: dict = {}
        for sensor_type, sensor_cfg in SENSOR_TYPES.items():
            key = f"{CONF_SENSOR_ENABLED_PREFIX}{sensor_type}"
            current_enabled = self._entry.options.get(key, True)
            sensor_schema_fields[
                vol.Optional(key, default=bool(current_enabled))
            ] = cv.boolean

        schema_fields: dict = {
            vol.Optional(
                CONF_RATE_LIMIT, default=int(current_rate_limit)
            ): vol.All(vol.Coerce(int), vol.Range(min=30, max=120)),
            vol.Optional(
                CONF_REPLAY_WINDOW, default=int(current_replay_window)
            ): vol.All(vol.Coerce(int), vol.Range(min=10, max=300)),
            vol.Optional(
                CONF_UPDATE_INTERVAL, default=int(current_update_interval)
            ): vol.All(
                vol.Coerce(int),
                vol.Range(min=MIN_UPDATE_INTERVAL, max=MAX_UPDATE_INTERVAL),
            ),
            vol.Optional(
                CONF_CONNECTED_THRESHOLD, default=int(current_connected_threshold)
            ): vol.All(
                vol.Coerce(int),
                vol.Range(min=MIN_CONNECTED_THRESHOLD, max=MAX_CONNECTED_THRESHOLD),
            ),
            vol.Optional("rotate_key", default=False): cv.boolean,
        }
        schema_fields.update(sensor_schema_fields)

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(schema_fields),
            description_placeholders={
                "device_id": device_id,
                "webhook_id": webhook_id,
                "webhook_url": webhook_url,
            },
        )

    async def async_step_rotate_key(self, user_input=None):
        """Confirm HMAC key rotation and generate a new secret."""
        if user_input is not None and user_input.get("confirm_rotate"):
            old_secret = self._entry.data.get(CONF_HMAC_SECRET)
            new_secret = _generate_hmac_secret()
            now = time.time()

            # Persist the new key and keep the old one for the grace period
            new_data = {
                **self._entry.data,
                CONF_HMAC_SECRET: new_secret,
                CONF_HMAC_OLD_SECRET: old_secret,
                CONF_HMAC_ROTATION_TIME: now,
            }
            self.hass.config_entries.async_update_entry(
                self._entry, data=new_data
            )

            # REQ-046 — the in-memory WebhookAuthenticator was constructed once
            # in async_setup_entry and keeps a private copy of the secret. The
            # async_update_entry call above persists the new key but does not
            # rebuild the authenticator, so until the next reload the rotated
            # entry would still accept the OLD secret as primary. Force an
            # immediate reload so the next webhook validates against the new key.
            await self.hass.config_entries.async_reload(self._entry.entry_id)

            _LOGGER.info(
                "HMAC key rotated for device %s — old key accepted for 60 minutes",
                self._entry.data.get(CONF_DEVICE_ID),
            )

            # Build QR payload with new key so user can scan it immediately
            webhook_id = self._entry.data.get(CONF_WEBHOOK_ID, "unknown")
            device_id = self._entry.data.get(CONF_DEVICE_ID, "unknown")
            try:
                ha_url = get_url(self.hass, prefer_external=True)
            except Exception:
                ha_url = "http://<your-ha-address>:8123"
            webhook_url = f"{ha_url}/api/webhook/{webhook_id}"
            qr_payload = _build_qr_payload(webhook_url, new_secret, device_id)

            return self.async_show_form(
                step_id="rotate_key_done",
                description_placeholders={
                    "new_secret": new_secret,
                    "qr_payload": qr_payload,
                    "grace_minutes": "60",
                },
            )

        return self.async_show_form(
            step_id="rotate_key",
            data_schema=vol.Schema(
                {
                    vol.Required("confirm_rotate", default=False): cv.boolean,
                }
            ),
        )

    async def async_step_rotate_key_done(self, user_input=None):
        """Acknowledge key-rotation completion and close the options flow."""
        if user_input is not None:
            return self.async_create_entry(title="", data=self._entry.options)

        # Reached only if the form is shown without user_input (shouldn't happen)
        return self.async_create_entry(title="", data=self._entry.options)
