# InfinAssistant — Home Assistant integration

Bridges an InfinAssistant watch (PineTime running the InfinAssistant firmware, through the companion [InfinAssistant Bridge](https://github.com/ryan-werts/infinassistant-bridge) Android app) to Home Assistant: watch sensors in, notifications and commands out, plus a Lovelace card for designing the watch face.

## Installation

### HACS (custom repository)

1. In HACS, open **Integrations**, then the menu, then **Custom repositories**.
2. Add `https://github.com/ryan-werts/infinassistant-ha` with category **Integration**.
3. Install **InfinAssistant** from HACS and restart Home Assistant.

### Manual

Clone or download this repository, copy the integration folder into your config directory, and restart:

    mkdir -p /config/custom_components
    cp -r custom_components/infinassistant /config/custom_components/

Copying into the parent directory also works for updates; naming the target `.../infinassistant` would nest a second copy inside an existing one.

### Add the integration

Go to **Settings → Devices & Services → Add Integration → InfinAssistant**.

The watch-face card comes with the integration. Once it is set up, every dashboard can use `type: custom:infinassistant-watchface`, with no file to copy and no resource to add. The integration serves the bundle at `/infinassistant/infinassistant-watchface.js` and has the frontend load it; the `?v=` on that URL changes with the bundle, so a browser never keeps an old card. Reload the browser once after the first setup.

If you installed the card by hand before (version 0.2.0 and older), **remove the `/local/infinassistant-watchface.js` resource** under **Settings → Dashboards → Resources**, then delete the file in `/config/www/`. Left in place, the browser loads both copies of the card, and whichever runs first is the one every dashboard uses. The browser console warns only when the two copies are different versions, so a quiet console does not mean the old resource is gone.

The full walkthrough, including pairing the app and the watch, is the [setup guide](https://github.com/ryan-werts/infinassistant-bridge/blob/main/docs/setup-guide.md) in the Bridge repository.

## Compatibility

<!-- compat:begin -->

| Component | Version | Release |
|-----------|---------|---------|
| Firmware (InfiniTime fork) | 2.4.105 | [2.4.105](https://github.com/ryan-werts/infinassistant-firmware/releases/tag/2.4.105) |
| Android app (InfinAssistant Bridge) | 2.1.127 | [2.1.127](https://github.com/ryan-werts/infinassistant-bridge/releases/tag/2.1.127) |
| Home Assistant integration | 0.3.5 | [0.3.5](https://github.com/ryan-werts/infinassistant-ha/releases/tag/0.3.5) |

**Breaking pairs.** These pairs must be upgraded together:

- App 2.1.124 or later needs firmware 2.4.103 or later. The watch's BLE config key was renamed from `infinisstant` to `infinassistant`, and older firmware is not supported. The app detects older firmware and offers the update.
- App 2.1.124 or later needs integration 0.3.3 or later. The Home Assistant domain was renamed from `infinisstant` to `infinassistant`.

Other version mismatches degrade gracefully: the HELLO feature bits tell each side what the other supports. If the watch does not report feature bit 16, the app shows "Update the watch" and offers the firmware bundled with it.

<!-- compat:end -->

## Configuration

The config flow generates an HMAC secret and shows a "QR payload" containing `webhook_url`, `hmac_secret` and `device_id`. It is a line of JSON text, not a scannable code, and the app has no QR scanner, so copy the values by hand. The Android app needs **both** the webhook ID and the HMAC secret — enter them under *InfinAssistant (HA Sensors)* in the app. Unsigned webhook posts are rejected with HTTP 401, so sensor reporting will not work until the secret is set on both sides.

## Events

| Event | When |
|---|---|
| `infinassistant_connected` | a sensor report arrives after the watch was considered offline |
| `infinassistant_disconnected` | no report within `connected_threshold` seconds (default 120) |
| `infinassistant_command` | a service or device action targets the watch; consumed by the Android app over the HA websocket |
| `infinassistant_watchface_layout_changed` | a new watch-face layout was published |

The connectivity events carry both `device_id` (the Home Assistant registry id, which is what device-automation triggers match on) and `mac` (the watch's BLE address, which the rest of the integration keys off).

## Services

`infinassistant.send_notification`, `infinassistant.trigger_vibration`, `infinassistant.set_alarm` — see `services.yaml`. `set_alarm` is accepted but not yet implemented on the watch; there is no alarm opcode in the bridge protocol.

Each fires `infinassistant_command` with the arguments nested under `data`.

## Watch-face card

The card's source is in `www/infinassistant-watchface/`. Build it with Node.js 20:

    (cd www/infinassistant-watchface && npm ci && npm run build)

`npm run build` writes `dist/infinassistant-watchface.js`, `dist/infinassistant-watchface.build.json` (the hashes of the card's inputs and of the bundle) and copies the bundle to `custom_components/infinassistant/frontend/`, where the integration serves it. All of them are committed; commit them together. `check_bundle.py` (no node needed) fails when the committed bundle or the frontend copy does not match the sources, and the export precheck runs it for the `ha` target.

The card previews one screen at a time; the arrows under it step through the layout's screens, as a swipe does on the watch. Each screen is drawn as the watch draws it, from the entities' live states: a tile screen as on firmware 2.4.94 and later, and the dashboard as on 2.4.98 and later. The dashboard's two events are read with `calendar.get_events`, as the app reads them; on a Home Assistant without it, each calendar entity's next event stands in. The preview shows a freezer alarm as soon as a freezer reads too warm; the watch shows it after 20 minutes. Battery, steps and heart rate come from the State Simulator, and its "Dashboard state" shows the greyed look of a state over 30 minutes old.

## Contributing

This repository is a mirror of the InfinAssistant source repository. Pull requests are applied to the source repository first, and they reach this repository with the next export. Open an issue to discuss larger changes before you start.

## Tests

    pip install pytest cbor2 voluptuous
    python -m pytest tests/ -q

The suite runs against hand-written stubs of the `homeassistant` package in `tests/conftest.py`, so it cannot catch Home Assistant API drift. `tests_ha/` covers that gap against the real package (`pip install pytest-homeassistant-custom-component`, then `python -m pytest tests_ha/ -q`). It needs Linux, because `homeassistant.runner` imports `fcntl`.

The card's unit tests (Vitest) cover its pure modules:

    cd www/infinassistant-watchface && npm ci && npm test

## License

MIT. See [LICENSE](LICENSE). Copyright (c) W6 Technology.
