"""The integration serves the watch-face card itself (custom_components/infinassistant/card.py).

The card used to be copied by hand into /config/www and added as a Lovelace
resource; a stale or missing copy made Home Assistant show "Configuration
error". These pin how the integration serves its own copy instead.
"""
from __future__ import annotations

import hashlib
import json
import logging
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest

from custom_components.infinassistant import async_setup, card
from custom_components.infinassistant.card import (
    CARD_PATH,
    CARD_URL,
    DATA_CARD_URL,
    async_register_card,
)

# conftest.py stubs homeassistant.components.http with this stand-in.
from homeassistant.components.http import StaticPathConfig

INTEGRATION_DIR = Path(card.__file__).parent
CARD_BUILD = INTEGRATION_DIR.parents[1] / "www" / "infinassistant-watchface" / "dist" / card.CARD_FILENAME


@pytest.fixture
def frontend_hass(hass, tmp_path):
    """hass with the frontend loaded, executor jobs run inline, and an empty config dir."""
    hass.config.components = {"frontend", "http", "webhook"}
    hass.config.path = lambda *parts: str(tmp_path.joinpath(*parts))
    hass.async_add_executor_job = AsyncMock(side_effect=lambda func, *args: func(*args))
    hass.http.async_register_static_paths = AsyncMock()
    hass.http.register_static_path = MagicMock()
    return hass


@pytest.fixture(autouse=True)
def add_extra_js_url(monkeypatch):
    """A fresh add_extra_js_url per test: the stub module's mock is shared."""
    add = MagicMock()
    monkeypatch.setattr(card, "add_extra_js_url", add)
    return add


def _version_of(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:12]


class TestServeTheCard:
    async def test_serves_the_bundle_and_adds_it_to_every_frontend(self, frontend_hass, add_extra_js_url):
        url = await async_register_card(frontend_hass)

        assert url == f"/infinassistant/infinassistant-watchface.js?v={_version_of(CARD_PATH)}"
        frontend_hass.http.async_register_static_paths.assert_awaited_once_with(
            [StaticPathConfig(CARD_URL, str(CARD_PATH), True)]
        )
        frontend_hass.http.register_static_path.assert_not_called()
        add_extra_js_url.assert_called_once_with(frontend_hass, url)
        assert frontend_hass.data[DATA_CARD_URL] == url

    async def test_older_home_assistant_registers_the_path_the_old_way(
        self, frontend_hass, add_extra_js_url, monkeypatch
    ):
        # StaticPathConfig and async_register_static_paths arrived in 2024.7.
        monkeypatch.setattr(card, "StaticPathConfig", None)

        url = await async_register_card(frontend_hass)

        frontend_hass.http.register_static_path.assert_called_once_with(CARD_URL, str(CARD_PATH), True)
        frontend_hass.http.async_register_static_paths.assert_not_awaited()
        add_extra_js_url.assert_called_once_with(frontend_hass, url)

    async def test_once_per_start(self, frontend_hass, add_extra_js_url):
        first = await async_register_card(frontend_hass)
        second = await async_register_card(frontend_hass)

        assert first == second
        frontend_hass.http.async_register_static_paths.assert_awaited_once()
        add_extra_js_url.assert_called_once()

    async def test_a_changed_bundle_gets_a_new_url(self, tmp_path):
        old, new = tmp_path / "old.js", tmp_path / "new.js"
        old.write_text("customElements.define('a', A);", encoding="utf-8")
        new.write_text("customElements.define('b', B);", encoding="utf-8")

        assert card._card_version(old) != card._card_version(new)
        assert card._card_version(old) == card._card_version(old)

    async def test_not_served_without_a_frontend(self, frontend_hass, add_extra_js_url):
        frontend_hass.config.components = {"http", "webhook"}

        assert await async_register_card(frontend_hass) is None
        frontend_hass.http.async_register_static_paths.assert_not_awaited()
        add_extra_js_url.assert_not_called()

    async def test_a_missing_bundle_is_logged_not_raised(
        self, frontend_hass, add_extra_js_url, monkeypatch, tmp_path, caplog
    ):
        monkeypatch.setattr(card, "CARD_PATH", tmp_path / "frontend" / "missing.js")

        with caplog.at_level(logging.ERROR, logger=card.__name__):
            assert await async_register_card(frontend_hass) is None

        assert "bundle is unreadable" in caplog.text
        frontend_hass.http.async_register_static_paths.assert_not_awaited()
        add_extra_js_url.assert_not_called()
        assert DATA_CARD_URL not in frontend_hass.data

    async def test_a_failed_registration_is_logged_not_raised(self, frontend_hass, add_extra_js_url, caplog):
        frontend_hass.http.async_register_static_paths.side_effect = RuntimeError("route exists")

        with caplog.at_level(logging.ERROR, logger=card.__name__):
            assert await async_register_card(frontend_hass) is None

        assert "Watch-face card not served" in caplog.text
        add_extra_js_url.assert_not_called()


class TestSetup:
    async def test_async_setup_serves_the_card(self, frontend_hass, add_extra_js_url):
        assert await async_setup(frontend_hass, {}) is True

        url = frontend_hass.data[DATA_CARD_URL]
        add_extra_js_url.assert_called_once_with(frontend_hass, url)
        frontend_hass.http.async_register_static_paths.assert_awaited_once()

    def test_manifest_sets_up_after_http_and_the_frontend(self):
        manifest = json.loads((INTEGRATION_DIR / "manifest.json").read_text(encoding="utf-8"))
        dependencies = manifest.get("dependencies", [])
        after = manifest.get("after_dependencies", [])

        assert "http" in dependencies
        assert "frontend" in dependencies + after


class TestBundledCopy:
    def test_the_integration_ships_the_card(self):
        assert CARD_PATH.is_file(), f"{CARD_PATH} is missing: run `npm run build` in www/infinassistant-watchface"
        assert CARD_PATH.stat().st_size > 0

    def test_the_bundled_card_is_the_cards_build(self):
        if not CARD_BUILD.is_file():
            pytest.skip(f"no card build at {CARD_BUILD}")
        assert CARD_PATH.read_bytes() == CARD_BUILD.read_bytes(), (
            "custom_components/infinassistant/frontend/infinassistant-watchface.js differs from the card's "
            "build (www/infinassistant-watchface/dist): run `npm run build` there, which copies the "
            "bundle, and commit both"
        )
