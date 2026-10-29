"""Phase G unit tests for the InfinAssistant Home Assistant custom integration.

Per BRD-InfinAssistant-Hardening-and-Fixes:
  - REQ-067: On safe-mode trip the watch shows "layout too heavy" banner.
  - REQ-069: Layout schema supports "quick_controls" screen type (screenType 3),
    4 tiles, optional long-press confirm enforced on all tiles.
"""
from __future__ import annotations

import re
import pytest
import voluptuous as vol

# conftest.py stubs HA modules before these imports execute.
from custom_components.infinassistant.services import PUSH_WATCHFACE_LAYOUT_SCHEMA

# Paths to firmware source file for banner-text acceptance check.
_FIRMWARE_HA_CPP = (
    "firmware/infinitime_overlay/src/displayapp/screens/HomeAssistant.cpp"
)


class TestSafeFaceBanner:
    """REQ-067 — safe-mode banner text is 'layout too heavy'."""

    def test_banner_text_is_layout_too_heavy(self, tmp_path):
        """HomeAssistant.cpp must use 'layout too heavy' for the safe-face label."""
        import pathlib

        # Locate the firmware source relative to the repo root (two levels up from
        # ha_integration/tests/).
        repo_root = pathlib.Path(__file__).parent.parent.parent
        cpp_path = repo_root / _FIRMWARE_HA_CPP

        if not cpp_path.exists():
            pytest.skip(f"Firmware source not found at {cpp_path}")

        content = cpp_path.read_text(encoding="utf-8")

        # Acceptance: the safe-face banner must be exactly "layout too heavy".
        assert '"layout too heavy"' in content, (
            f"REQ-067: HomeAssistant.cpp must set safe-face banner to "
            f"'layout too heavy', but the string was not found in {cpp_path}"
        )

        # Guard: the old "low memory" text must not appear in the safe-face block.
        # We allow "low memory" elsewhere (e.g. comments), but the lv_label_set_text_static
        # call in the safeFaceMode_ branch must not use it.
        safe_face_block_match = re.search(
            r"safeFaceMode_\s*\)\s*\{.*?\}",
            content,
            re.DOTALL,
        )
        if safe_face_block_match:
            block = safe_face_block_match.group(0)
            assert '"low memory"' not in block, (
                "REQ-067: safe-face block still contains the old 'low memory' string"
            )

    def test_banner_text_not_low_memory_in_safe_face_branch(self, tmp_path):
        """Regression: 'low memory' must not appear as the safe-face label."""
        import pathlib

        repo_root = pathlib.Path(__file__).parent.parent.parent
        cpp_path = repo_root / _FIRMWARE_HA_CPP

        if not cpp_path.exists():
            pytest.skip(f"Firmware source not found at {cpp_path}")

        content = cpp_path.read_text(encoding="utf-8")

        # The safe-face banner lv_label_set_text_static call must not use "low memory".
        # We look for the pattern: lv_label_set_text_static(..., "low memory") near safeFaceMode_.
        # A simple check: confirm "low memory" does not appear in the same lv_label_set_text_static
        # call that is in the safe-face branch, by confirming the string is simply absent.
        assert '"low memory"' not in content, (
            "REQ-067: 'low memory' still present in HomeAssistant.cpp — "
            "safe-face banner must be 'layout too heavy'"
        )


def _base_layout(**extra_screens):
    """Return a minimal valid v2 push_watchface_layout payload."""
    return {
        "device_id": "dev1",
        "layout": {
            "version": 2,
            "theme": {"background": "dark", "accent": "#FF5722"},
            "header": {"time": {"format": "HH:mm"}},
            "screens": [],
        },
    }


def _tile(label: str = "TV", entity: str = "switch.tv") -> dict:
    return {"label": label, "entity": entity, "color": "#4A90D9"}


class TestQuickControlsScreenType:
    """REQ-069 — quick_controls screen type accepted by HA schema."""

    # -------------------------------------------------------------------------
    # Acceptance: schema accepts integer type 3
    # -------------------------------------------------------------------------
    def test_schema_accepts_screentype_int_3(self):
        """screenType: 3 (integer) is accepted."""
        data = _base_layout()
        data["layout"]["screens"] = [
            {
                "screenType": 3,
                "tiles": [_tile("TV", "switch.tv"), _tile("Fan", "switch.fan")],
            }
        ]
        result = PUSH_WATCHFACE_LAYOUT_SCHEMA(data)
        assert result is not None

    # -------------------------------------------------------------------------
    # Acceptance: schema accepts string "quick_controls"
    # -------------------------------------------------------------------------
    def test_schema_accepts_screentype_string_quick_controls(self):
        """screenType: 'quick_controls' (string) is accepted."""
        data = _base_layout()
        data["layout"]["screens"] = [
            {
                "screenType": "quick_controls",
                "tiles": [_tile("Light", "light.living")],
            }
        ]
        result = PUSH_WATCHFACE_LAYOUT_SCHEMA(data)
        assert result is not None

    # -------------------------------------------------------------------------
    # Acceptance: 4-tile (full 2x2) is allowed
    # -------------------------------------------------------------------------
    def test_schema_accepts_four_tiles(self):
        """4 tiles on a quick_controls screen (full 2×2 grid) is valid."""
        data = _base_layout()
        data["layout"]["screens"] = [
            {
                "screenType": 3,
                "tiles": [
                    _tile("TV", "switch.tv"),
                    _tile("Fan", "switch.fan"),
                    _tile("Light", "light.main"),
                    _tile("Garage", "cover.garage"),
                ],
            }
        ]
        PUSH_WATCHFACE_LAYOUT_SCHEMA(data)

    # -------------------------------------------------------------------------
    # Acceptance: empty tiles list is valid (no tiles configured yet)
    # -------------------------------------------------------------------------
    def test_schema_accepts_zero_tiles(self):
        """0 tiles on a quick_controls screen is valid."""
        data = _base_layout()
        data["layout"]["screens"] = [{"screenType": 3, "tiles": []}]
        PUSH_WATCHFACE_LAYOUT_SCHEMA(data)

    # -------------------------------------------------------------------------
    # Rejection: 5+ tiles exceed 2×2 grid limit
    # -------------------------------------------------------------------------
    def test_schema_rejects_five_tiles(self):
        """5 tiles on a quick_controls screen must be rejected."""
        data = _base_layout()
        data["layout"]["screens"] = [
            {
                "screenType": 3,
                "tiles": [
                    _tile("T1", "switch.t1"),
                    _tile("T2", "switch.t2"),
                    _tile("T3", "switch.t3"),
                    _tile("T4", "switch.t4"),
                    _tile("T5", "switch.t5"),
                ],
            }
        ]
        with pytest.raises(vol.MultipleInvalid):
            PUSH_WATCHFACE_LAYOUT_SCHEMA(data)

    # -------------------------------------------------------------------------
    # Rejection: string "3" should also trigger tile-count guard
    # -------------------------------------------------------------------------
    def test_schema_rejects_five_tiles_via_string_type_3(self):
        """screenType '3' (string) also enforces the 4-tile cap."""
        data = _base_layout()
        data["layout"]["screens"] = [
            {
                "screenType": "3",
                "tiles": [_tile(f"T{i}", f"switch.t{i}") for i in range(5)],
            }
        ]
        with pytest.raises(vol.MultipleInvalid):
            PUSH_WATCHFACE_LAYOUT_SCHEMA(data)

    # -------------------------------------------------------------------------
    # Non-interference: quick_controls restriction does not affect tiles screens
    # -------------------------------------------------------------------------
    def test_tiles_screen_allows_more_than_four_tiles(self):
        """A standard tiles_actions screen (type=1) is not affected by the REQ-069 cap."""
        data = _base_layout()
        data["layout"]["screens"] = [
            {
                "screenType": 1,
                # 6 tiles is valid for tiles_actions (3×2 grid) — REQ-069 must not block this
                "tiles": [_tile(f"T{i}", f"switch.t{i}") for i in range(6)],
            }
        ]
        # Must not raise
        PUSH_WATCHFACE_LAYOUT_SCHEMA(data)

    # -------------------------------------------------------------------------
    # Mixed screen list: one quick_controls + one tiles_actions both accepted
    # -------------------------------------------------------------------------
    def test_mixed_screen_types_accepted(self):
        """A layout with both quick_controls and tiles_actions screens is valid."""
        data = _base_layout()
        data["layout"]["screens"] = [
            {
                "screenType": "quick_controls",
                "tiles": [_tile("TV", "switch.tv"), _tile("Fan", "switch.fan")],
            },
            {
                "screenType": 1,
                "tiles": [_tile("Light", "light.main")],
            },
        ]
        PUSH_WATCHFACE_LAYOUT_SCHEMA(data)
