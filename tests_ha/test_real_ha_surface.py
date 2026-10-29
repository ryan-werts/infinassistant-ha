"""Validate the integration against the REAL Home Assistant package.

The main suite (`tests/`) runs against hand-written MagicMock stubs. That makes
it fast and dependency-free, but it cannot catch Home Assistant API drift: a
MagicMock accepts any attribute, any signature and any call. Three stub/reality
divergences were found in a single session — an entry without `.options`, a
missing `dt_util.parse_datetime`, and a coordinator attribute that did not
exist — each of which the stub suite reported as passing.

These tests import the real package, so a removed or renamed HA API fails here.
They are intentionally shallow: this is drift detection, not a re-implementation
of the stub suite.
"""
from __future__ import annotations

import importlib

import pytest


INTEGRATION_MODULES = [
    "custom_components.infinassistant",
    "custom_components.infinassistant.binary_sensor",
    "custom_components.infinassistant.card",
    "custom_components.infinassistant.config_flow",
    "custom_components.infinassistant.const",
    "custom_components.infinassistant.coordinator",
    "custom_components.infinassistant.device_action",
    "custom_components.infinassistant.device_trigger",
    "custom_components.infinassistant.security",
    "custom_components.infinassistant.sensor",
    "custom_components.infinassistant.services",
]


@pytest.mark.parametrize("module", INTEGRATION_MODULES)
def test_module_imports_against_real_homeassistant(module: str) -> None:
    """Every module must import with the real package present.

    This is the single highest-value assertion in the file: it is what catches
    a Home Assistant release removing an API the integration still calls, which
    no amount of MagicMock stubbing can detect.
    """
    importlib.import_module(module)


def test_manifest_is_wellformed() -> None:
    """hassfest-style checks on the bits that bite in practice."""
    import json
    from pathlib import Path

    manifest = json.loads(
        (
            Path(__file__).resolve().parent.parent
            / "custom_components"
            / "infinassistant"
            / "manifest.json"
        ).read_text(encoding="utf-8")
    )

    for key in ("domain", "name", "codeowners", "documentation", "version", "iot_class"):
        assert key in manifest, f"manifest.json is missing {key!r}"

    assert manifest["domain"] == "infinassistant"
    assert manifest["codeowners"], "codeowners must not be empty"
    assert "yourorg" not in manifest["documentation"], (
        "documentation URL is still the template placeholder"
    )
    assert manifest["iot_class"] in {
        "assumed_state", "cloud_polling", "cloud_push",
        "local_polling", "local_push", "calculated",
    }


def test_dt_util_apis_used_by_the_integration_exist() -> None:
    """Pin the `dt_util` surface the integration relies on.

    binary_sensor uses all three. The stub suite only defined two of them, so a
    real call to parse_datetime raised AttributeError in production while the
    tests stayed green.
    """
    from homeassistant.util import dt as dt_util

    assert callable(dt_util.utcnow)
    assert callable(dt_util.utc_from_timestamp)
    assert callable(dt_util.parse_datetime)
    # Real parse_datetime returns None on bad input rather than raising.
    assert dt_util.parse_datetime("not-a-datetime") is None


def test_config_entry_exposes_options() -> None:
    """ConfigEntry always has `.options`; the test stub originally did not.

    binary_sensor reads `entry.options` for the connectivity threshold, so a
    stub without it hid a real AttributeError.
    """
    import inspect

    from homeassistant.config_entries import ConfigEntry

    # `options` is assigned in __init__, so probe the signature rather than the
    # class object.
    assert "options" in inspect.signature(ConfigEntry.__init__).parameters


def test_options_flow_does_not_assign_config_entry() -> None:
    """Home Assistant 2025.12 removed the setter of OptionsFlow.config_entry.

    An options flow that assigns it raises AttributeError as it is built, so
    the options dialog does not open. The flow keeps its entry as `_entry`;
    the stub suite's OptionsFlow mirrors the real one, and this pins that.
    """
    from homeassistant.config_entries import OptionsFlow

    from custom_components.infinassistant.config_flow import InfinassistantConfigFlow

    entry = object()
    flow = InfinassistantConfigFlow.async_get_options_flow(entry)

    assert isinstance(flow, OptionsFlow)
    assert flow._entry is entry


def test_card_serving_apis_exist() -> None:
    """Pin the surface card.py serves the Lovelace card through.

    The stub suite defines StaticPathConfig and add_extra_js_url itself, so it
    cannot notice either changing. card.py builds StaticPathConfig positionally
    (url, path, cache_headers) and falls back to register_static_path only
    when StaticPathConfig is missing (before 2024.7).
    """
    import dataclasses
    import inspect

    from homeassistant.components.frontend import add_extra_js_url
    from homeassistant.components.http import HomeAssistantHTTP, StaticPathConfig

    from custom_components.infinassistant import card

    assert card.StaticPathConfig is StaticPathConfig
    fields = [f.name for f in dataclasses.fields(StaticPathConfig)]
    assert fields[:3] == ["url_path", "path", "cache_headers"]
    assert inspect.iscoroutinefunction(HomeAssistantHTTP.async_register_static_paths)
    assert list(inspect.signature(add_extra_js_url).parameters)[:2] == ["hass", "url"]


async def test_card_is_served_over_real_http(hass, monkeypatch) -> None:
    """The card's URL, query and all, resolves to the bundle on the real http component.

    The frontend package is not installed here, so add_extra_js_url is recorded
    rather than run. The request goes to the router, not over a socket: the
    test client's DNS resolver leaves a thread behind that the harness rejects.
    """
    from aiohttp import web
    from aiohttp.test_utils import make_mocked_request
    from homeassistant.setup import async_setup_component

    from custom_components.infinassistant import card

    assert await async_setup_component(hass, "http", {})
    hass.config.components.add("frontend")
    added: list[str] = []
    monkeypatch.setattr(card, "add_extra_js_url", lambda _hass, url: added.append(url))

    url = await card.async_register_card(hass)

    assert added == [url]
    request = make_mocked_request("GET", url, app=hass.http.app)
    response = await (await hass.http.app.router.resolve(request)).handler(request)
    assert isinstance(response, web.FileResponse)
    assert "max-age" in response.headers.get("Cache-Control", "")


def test_no_removed_hass_components_accessor() -> None:
    """`hass.components.<x>` was deprecated and then removed.

    The integration used `hass.components.persistent_notification.async_create`.
    Fail loudly if that pattern comes back.
    """
    from pathlib import Path

    root = Path(__file__).resolve().parent.parent / "custom_components" / "infinassistant"
    offenders = [
        f.name
        for f in root.rglob("*.py")
        if "hass.components." in f.read_text(encoding="utf-8")
    ]
    assert not offenders, (
        "hass.components.<x> is removed from modern Home Assistant; "
        f"still used in: {offenders}"
    )
