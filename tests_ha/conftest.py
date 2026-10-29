"""Fixtures for the real-Home-Assistant test suite.

Deliberately a SEPARATE directory from `tests/`. That suite installs ~40 stub
`homeassistant.*` modules into `sys.modules` at import time; anything sharing a
conftest with it would get the stubs instead of the real package, which is the
whole thing this suite exists to avoid.

This suite only runs where the real `homeassistant` package can be imported —
which means Linux. `homeassistant.runner` imports `fcntl`, so
`pytest-homeassistant-custom-component` cannot load on Windows at all; the
module-level skip below keeps a Windows developer's run green rather than
erroring at collection.

    pip install pytest-homeassistant-custom-component
    cd ha_integration && python -m pytest tests_ha/ -q
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

# Make `custom_components.infinassistant` importable.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

collect_ignore_glob: list[str] = []

try:  # pragma: no cover - environment probe
    import homeassistant  # noqa: F401

    _HA_AVAILABLE = True
except Exception:  # noqa: BLE001
    _HA_AVAILABLE = False

if not _HA_AVAILABLE:
    collect_ignore_glob.append("test_*.py")


# NOTE: do NOT declare pytest_plugins here — the package registers itself via
# an entry point, and naming it again raises "Plugin already registered under a
# different name".


@pytest.fixture(autouse=True)
def _expose_our_custom_components():
    """Make this repo's `custom_components` importable.

    pytest-homeassistant-custom-component registers `custom_components` as a
    namespace package bound to its own `testing_config/custom_components`, so a
    plain `import custom_components.infinassistant` resolves against the plugin's
    directory and fails. Appending our directory to the namespace package's
    __path__ lets both coexist.
    """
    import custom_components

    ours = str(Path(__file__).resolve().parent.parent / "custom_components")
    if ours not in custom_components.__path__:
        custom_components.__path__.append(ours)
    yield


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    """Let Home Assistant load `custom_components.infinassistant`."""
    yield
