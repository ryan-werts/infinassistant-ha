"""Serve the watch-face Lovelace card from the integration.

The card used to be copied by hand to /config/www and added as a Lovelace
resource, and a stale or missing copy made Home Assistant show "Configuration
error". The integration now ships the built bundle (the card's `npm run build`
copies it to frontend/) and has every frontend load it.
"""
from __future__ import annotations

import hashlib
import logging
from pathlib import Path

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.core import HomeAssistant

try:
    from homeassistant.components.http import StaticPathConfig
except ImportError:  # Home Assistant before 2024.7
    StaticPathConfig = None

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

CARD_FILENAME = "infinassistant-watchface.js"
CARD_PATH = Path(__file__).parent / "frontend" / CARD_FILENAME
CARD_URL = f"/{DOMAIN}/{CARD_FILENAME}"

# Not under hass.data[DOMAIN]: that dict holds config entries only.
DATA_CARD_URL = f"{DOMAIN}_card_url"


def _card_version(path: Path) -> str:
    """The bundle's content hash: a changed card gets a new URL, so no browser keeps the old one."""
    return hashlib.sha256(path.read_bytes()).hexdigest()[:12]


async def async_register_card(hass: HomeAssistant) -> str | None:
    """Serve the card and add it to every frontend, once per Home Assistant start.

    Returns the module URL, or None when the card is not served. The webhook and
    the sensors work without it, so a failure is logged, never raised.
    """
    if DATA_CARD_URL in hass.data:
        return hass.data[DATA_CARD_URL]
    if "frontend" not in hass.config.components:
        _LOGGER.debug("Frontend not loaded: the watch-face card is not served")
        return None

    try:
        version = await hass.async_add_executor_job(_card_version, CARD_PATH)
    except OSError as err:
        _LOGGER.error("Watch-face card not served, its bundle is unreadable: %s", err)
        return None

    try:
        if StaticPathConfig is not None:
            await hass.http.async_register_static_paths(
                [StaticPathConfig(CARD_URL, str(CARD_PATH), True)]
            )
        else:
            hass.http.register_static_path(CARD_URL, str(CARD_PATH), True)
        url = f"{CARD_URL}?v={version}"
        add_extra_js_url(hass, url)
    except Exception:  # noqa: BLE001 — the card must not take the integration down
        _LOGGER.exception("Watch-face card not served")
        return None

    hass.data[DATA_CARD_URL] = url
    _LOGGER.debug("Watch-face card served as %s", url)
    return url
