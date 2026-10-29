# Changelog

All notable changes to the InfinAssistant Home Assistant integration. Versions before 0.3.3 were private builds under the old name (`infinisstant`); their changes are not listed here.

## [0.3.5] - 2026-10-28

### Fixed
- A heart rate of 0 is no longer logged as an out-of-range value. The watch sends 0 when it has no reading; Heart Rate shows unknown, as before, and the range-violation count no longer includes it. Values that are really out of range (below 15 or above 260 bpm) still log a warning.
- The Lovelace card bundle is rebuilt from the current sources. The one shipped in 0.3.4 predated a change to the card's generated limits.

### Added
- `npm run build` records a hash of the card's inputs and of the bundle in `www/infinassistant-watchface/dist/`, and `www/infinassistant-watchface/check_bundle.py` (no node needed) fails when the committed bundle or the copy in `custom_components/infinassistant/frontend/` does not match the sources. The test suite runs it, and so does the export.

## [0.3.4] - 2026-10-28

### Fixed
- Text sensors (`motion_state` and the new `heart_rate_state`) are accepted by the webhook. The input check had dropped every text value, so Motion State never reached Home Assistant. A text value that is too long or not printable is set to unknown with a warning; the rest of the report is kept.

### Added
- Heart Rate State sensor (`heart_rate_state`), a text sensor.

## [0.3.3] - 2026-10-27

### Changed
- Renamed the domain from `infinisstant` to `infinassistant`, including the services and events. The existing entry was switched in place, so existing entities kept their IDs and history.
- Requires InfinAssistant Bridge 2.1.124 or later and firmware 2.4.103 or later. Older firmware is not supported.
