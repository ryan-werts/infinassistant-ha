/**
 * Watch Layout Exporter
 *
 * Converts the card configuration into the Watch Layout JSON payload.
 *
 * IMPORTANT: This exports CONFIGURATION ONLY, not live state data.
 * The exported JSON contains entity IDs and formatting rules.
 * The Android app is responsible for querying Home Assistant for
 * current entity states and calculating derived values (colors, etc.).
 */

import type {
  CardConfig,
  WatchLayoutJSON,
  WatchLayoutPresenceConfig,
  WatchLayoutPresenceIcon,
  WatchLayoutEventsConfig,
  WatchLayoutTile,
  WatchLayoutAction,
  WatchLayoutStatusBar,
  WatchLayoutScreen,
  WatchLayoutDashboard,
  WatchLayoutStatusGroup,
  WatchLayoutSensorGroup,
  WatchLayoutGlyph,
  WatchLayoutSensor,
  WatchLayoutLogbook,
  ScreenConfig,
  DashboardConfig,
} from './types';
import {
  THEME_BACKGROUNDS,
  DEFAULT_ACCENT,
  DEFAULT_ACTIVE_COLOR,
  DEFAULT_INACTIVE_COLOR,
  DASHBOARD_MAX_STATUS_GROUPS,
  DASHBOARD_MAX_GLYPHS_PER_GROUP,
  DASHBOARD_MAX_SENSOR_GROUPS,
  DASHBOARD_MAX_SENSORS_PER_GROUP,
} from './constants';

// Layout version
const LAYOUT_VERSION = 2;  // Bumped version for config-only format

/**
 * Truncate text to max length
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength);
}

/** FR-26: the symbol a status glyph exports as: a single character as it is, "?" otherwise. */
export function exportedGlyphSymbol(symbol: string | undefined): string {
  return symbol && symbol.length === 1 ? symbol : '?';
}

/**
 * What the watch makes of a status glyph's symbol, when it does not draw it as typed: null when it
 * does. The export turns an empty or longer symbol into "?" (FR-26), the app drops a blank one
 * (WatchFaceParser), the firmware one that is not ASCII 1-127 (LayoutDecoder.cpp), and the
 * dashboard never draws "#", which would end its colour span (HomeAssistant.cpp).
 */
export function glyphSymbolProblem(symbol: string | undefined): string | null {
  if (!symbol) return 'an empty symbol shows as ? on the watch';
  if (symbol !== exportedGlyphSymbol(symbol)) return `'${symbol}' shows as ? on the watch`;
  const code = symbol.charCodeAt(0);
  if (code < 1 || code > 0x7f || symbol.trim() === '' || symbol === '#') return `the watch can't draw '${symbol}'`;
  return null;
}

/**
 * Build presence configuration for the header.
 * Reads from the first dashboard screen's presence config if available,
 * falls back to the legacy header.presence config for backward compat.
 * Exports entity IDs and config rules, NOT current state values.
 */
function buildPresenceConfig(config: CardConfig): WatchLayoutPresenceConfig {
  // Prefer presence from first dashboard screen (Phase 6+)
  const dashboardPresence = (config.screens || [])
    .find(s => s.screenType === 'dashboard' && s.dashboard?.presence)
    ?.dashboard?.presence;
  const src = dashboardPresence ?? config.header?.presence;

  if (!src?.enabled) {
    return {
      enabled: false,
      homeZone: '',
      longAwayThreshold: '24:00:00',
      icons: [],
    };
  }

  const icons: WatchLayoutPresenceIcon[] = (src.icons || []).map(iconConfig => ({
    type: iconConfig.icon,
    entity: iconConfig.entity,
    hideIfUnknown: iconConfig.hide_if_unknown,
  }));

  return {
    enabled: true,
    homeZone: src.home_zone,
    longAwayThreshold: src.long_away_threshold,
    icons,
  };
}

/**
 * Build events configuration
 * Exports calendar entity IDs and display rules, NOT current events
 */
function buildEventsConfig(config: CardConfig): WatchLayoutEventsConfig {
  return {
    enabled: config.events.enabled,
    calendars: config.events.calendars,
    maxEvents: config.events.max_events,
    soonWindow: config.events.soon_window,
    showIfEmpty: config.events.show_if_empty,
    allDay: config.events.all_day,
  };
}

/**
 * Build tiles array - exports config only
 * Entity IDs and formatting rules, NOT current values or colors
 */
function buildTiles(tiles: CardConfig['tiles']): WatchLayoutTile[] {
  return tiles
    .filter(tileConfig => tileConfig.enabled && (tileConfig.entity || tileConfig.device_id))
    .map(tileConfig => {
      const tile: WatchLayoutTile = {
        label: truncate(tileConfig.label.toUpperCase(), 8),
        icon: tileConfig.icon,
        displayMode: tileConfig.displayMode === 'icon' ? 1 : 0,
        device_id: tileConfig.device_id,
        entity: tileConfig.entity,
        type: tileConfig.type,
        colorMode: tileConfig.color,
        rules: tileConfig.rules.map(rule => ({
          condition: rule.condition,
          color: rule.color,
        })),
        tap: tileConfig.tap,
        format: {
          prefix: tileConfig.format.prefix,
          suffix: tileConfig.format.suffix,
          unit: tileConfig.format.unit,
          uppercase: tileConfig.format.uppercase,
        },
      };
      return tile;
    });
}

/**
 * Build actions array - exports config only
 * Entity IDs and action definitions, NOT current state colors
 */
function buildActions(actions: CardConfig['actions']): WatchLayoutAction[] {
  return actions
    .filter(actionConfig => actionConfig.enabled)
    .map(actionConfig => {
      const action: WatchLayoutAction = {
        label: truncate(actionConfig.label.toUpperCase(), 10),
        icon: actionConfig.icon,
        entity: actionConfig.entity,
        actionType: actionConfig.action,
        stateColor: actionConfig.state_color,
        dimmer: actionConfig.action === 'light.dimmer' ? actionConfig.dimmer : undefined,
      };

      // Add service_call fields
      if (actionConfig.action === 'service_call') {
        action.domain = actionConfig.domain;
        action.service = actionConfig.service;
      }

      // Add device_action fields
      if (actionConfig.action === 'device_action') {
        action.deviceId = actionConfig.device_id;
        action.deviceAction = actionConfig.device_action;
      }

      return action;
    });
}

/**
 * Build status bar configuration - exports config only
 * Which indicators to show and entity sources, NOT current values
 */
function buildStatusBar(config: CardConfig): WatchLayoutStatusBar {
  if (!config.status_bar.enabled) {
    return { enabled: false };
  }

  return {
    enabled: true,
    battery: config.status_bar.battery ? {
      enabled: true,
      entity: null,  // Watch source
    } : undefined,
    bluetooth: config.status_bar.bluetooth ? {
      enabled: true,
      entity: null,  // Watch source
    } : undefined,
    steps: config.status_bar.steps ? {
      enabled: true,
      entity: config.status_bar.sources.steps_entity,
    } : undefined,
    heartRate: config.status_bar.heart_rate ? {
      enabled: true,
      entity: config.status_bar.sources.hr_entity,
    } : undefined,
    notifications: config.status_bar.notifications ? {
      enabled: true,
      entity: config.status_bar.sources.notifications_entity,
    } : undefined,
  };
}

/**
 * Build dashboard configuration - exports config only.
 * Entity IDs and layout structure, NOT current entity states.
 *
 * FR-25: Enforces firmware limits by truncating over-limit collections.
 * FR-26: Validates glyph symbols are single characters; defaults to "?" otherwise. The validator
 * warns about each such symbol (glyphSymbolProblem), so the "?" is never a surprise.
 */
function buildDashboard(dashboardConfig: DashboardConfig): WatchLayoutDashboard {
  let truncated = false;

  // FR-25: enforce max status group count
  const rawStatusGroups = dashboardConfig.statusGroups || [];
  if (rawStatusGroups.length > DASHBOARD_MAX_STATUS_GROUPS) {
    truncated = true;
  }
  const clampedStatusGroups = rawStatusGroups.slice(0, DASHBOARD_MAX_STATUS_GROUPS);

  // Build status groups (doors, garage, motion, lights, media)
  const statusGroups: WatchLayoutStatusGroup[] = clampedStatusGroups.map(group => {
    const rawGlyphs = group.glyphs || [];
    // FR-25: enforce max glyphs per group
    if (rawGlyphs.length > DASHBOARD_MAX_GLYPHS_PER_GROUP) {
      truncated = true;
    }
    const clampedGlyphs = rawGlyphs.slice(0, DASHBOARD_MAX_GLYPHS_PER_GROUP);

    return {
      type: group.type,
      glyphs: clampedGlyphs.map((glyph): WatchLayoutGlyph => ({
        symbol: exportedGlyphSymbol(glyph.symbol),
        entity: glyph.entity,
      })),
    };
  });

  // FR-25: enforce max sensor group count
  const rawSensorGroups = dashboardConfig.sensorGroups || [];
  if (rawSensorGroups.length > DASHBOARD_MAX_SENSOR_GROUPS) {
    truncated = true;
  }
  const clampedSensorGroups = rawSensorGroups.slice(0, DASHBOARD_MAX_SENSOR_GROUPS);

  // Build sensor groups (thermostats, freezers, beacons)
  const sensorGroups: WatchLayoutSensorGroup[] = clampedSensorGroups.map(group => {
    const rawSensors = group.sensors || [];
    // FR-25: enforce max sensors per group
    if (rawSensors.length > DASHBOARD_MAX_SENSORS_PER_GROUP) {
      truncated = true;
    }
    const clampedSensors = rawSensors.slice(0, DASHBOARD_MAX_SENSORS_PER_GROUP);

    return {
      type: group.type,
      sensors: clampedSensors.map((sensor): WatchLayoutSensor => ({
        entity: sensor.entity,
        displayType: sensor.displayType,
        symbol: sensor.symbol,
      })),
    };
  });

  // FR-25: warn if any collection was truncated
  if (truncated) {
    console.warn('Configuration exceeds firmware limits — some items were truncated for the watch');
  }

  // FR-24: configurable headline value — pass entity ID for Android-side resolution
  const configurableValue = dashboardConfig.configurableValue?.entity ? {
    label: truncate(dashboardConfig.configurableValue.label || '', 11),
    entity: dashboardConfig.configurableValue.entity,
    truncateTo: dashboardConfig.configurableValue.truncateTo ?? 19,
  } : undefined;

  // FR-24: inline metric slots — pass entity IDs for Android-side resolution
  const rawInlineMetrics = dashboardConfig.inlineMetrics || [];
  const builtInlineMetrics: Array<{ label: string; entity: string; round?: boolean } | null> = [];
  for (let i = 0; i < 2; i++) {
    const slot = rawInlineMetrics[i];
    if (slot?.entity) {
      builtInlineMetrics.push({
        label: truncate(slot.label || '', 2),
        entity: slot.entity,
        round: slot.round,
      });
    } else {
      builtInlineMetrics.push(null);
    }
  }

  return {
    statusGroups,
    sensorGroups,
    weather: dashboardConfig.weather?.entity ? {
      entity: dashboardConfig.weather.entity,
    } : undefined,
    // A list only: YAML can make events anything, and the validator reports what is not a list.
    events: Array.isArray(dashboardConfig.events)
      ? dashboardConfig.events.map(eventConfig => ({
        calendar: eventConfig?.calendar,
      }))
      : undefined,
    notifications: dashboardConfig.notifications?.map(notifConfig => ({
      source: notifConfig.source || 'HA',
    })),
    configurableValue,
    inlineMetrics: builtInlineMetrics.some(m => m !== null) ? builtInlineMetrics : undefined,
  };
}

/**
 * Build logbook configuration - exports config only
 * Entity IDs and query parameters, NOT event data
 */
function buildLogbook(logbookConfig: { entityIds: string[]; maxEntries: number; hoursBack: number }): WatchLayoutLogbook {
  return {
    entityIds: logbookConfig.entityIds.filter(id => id.length > 0),
    maxEntries: Math.min(Math.max(logbookConfig.maxEntries, 1), 15),
    hoursBack: Math.min(Math.max(logbookConfig.hoursBack, 1), 48),
  };
}

/**
 * Build screens array for multi-screen format - exports config only
 */
function buildScreens(config: CardConfig): WatchLayoutScreen[] {
  if (!config.screens || config.screens.length === 0) {
    return [];
  }

  return config.screens
    .map((screenConfig: ScreenConfig) => {
      const screenType = screenConfig.screenType === 'dashboard' ? 0 : 1;

      const screen: WatchLayoutScreen = {
        screenType,
        name: screenConfig.name,
      };

      if (screenType === 0 && screenConfig.dashboard) {
        // Dashboard screen
        screen.dashboard = buildDashboard(screenConfig.dashboard);
        screen.tiles = [];
      } else {
        // Tiles screen (tiles)
        screen.tileLayout = screenConfig.tileLayout ?? 4;
        screen.tiles = buildTiles(screenConfig.tiles || []);
        screen.dashboard = undefined;
      }

      return screen;
    });
}

/**
 * Export the card configuration to Watch Layout JSON
 *
 * This exports CONFIGURATION ONLY:
 * - Entity IDs to query for state
 * - Formatting rules (prefix, suffix, uppercase, etc.)
 * - Color rules (thresholds and conditions)
 * - Layout structure (which screens, what elements)
 *
 * The Android app is responsible for:
 * - Querying Home Assistant for current entity states
 * - Calculating derived values (presence state, colors, etc.)
 * - Updating the watch face dynamically as states change
 */
export function exportWatchLayout(config: CardConfig): WatchLayoutJSON {
  const accent = config.theme.accent || DEFAULT_ACCENT;

  const screens = buildScreens(config);
  const hasScreens = screens.length > 0;

  return {
    version: LAYOUT_VERSION,
    theme: {
      background: THEME_BACKGROUNDS[config.theme.preset],
      accent,
    },
    header: {
      time: {
        format: config.header.time.format,
        align: config.header.time.align,
      },
      presence: buildPresenceConfig(config),
    },
    statusBar: buildStatusBar(config),
    events: buildEventsConfig(config),
    screens,
    // Global tile colors for entity-state dynamic coloring
    defaultActiveColor: config.theme.activeColor || DEFAULT_ACTIVE_COLOR,
    defaultInactiveColor: config.theme.inactiveColor || DEFAULT_INACTIVE_COLOR,
    // Logbook app config
    ...(config.logbook_app ? {
      logbookApp: {
        entityIds: config.logbook_app.entities.filter(e => e.trim() !== ''),
        maxEntries: config.logbook_app.max_entries,
        hoursBack: config.logbook_app.hours_back,
      },
    } : {}),
    // Home control config
    ...(config.home_control ? {
      homeControl: {
        devices: config.home_control.devices
          .filter(d => d.entity_id.trim() !== '')
          .map(d => ({
            entityId: d.entity_id,
            name: d.name || undefined,
            domain: d.domain || undefined,
          })),
      },
    } : {}),
    // DEPRECATED v1 fields: only included when no screens are defined (backward compat)
    ...(hasScreens ? {} : {
      tiles: buildTiles(config.tiles),
      actions: buildActions(config.actions),
    }),
  };
}

/**
 * Estimate the payload size in bytes
 */
export function estimatePayloadSize(layout: WatchLayoutJSON): number {
  const json = JSON.stringify(layout);
  return new TextEncoder().encode(json).length;
}

/**
 * Compress the layout payload (stub - implement actual compression as needed)
 */
export function compressPayload(layout: WatchLayoutJSON): Uint8Array {
  // For now, just return JSON as bytes
  // In production, this could use CBOR, msgpack, or custom compression
  const json = JSON.stringify(layout);
  return new TextEncoder().encode(json);
}

/**
 * Generate deterministic JSON string for comparison
 */
export function toCanonicalJSON(layout: WatchLayoutJSON): string {
  // Sort keys for deterministic output
  return JSON.stringify(layout, Object.keys(layout).sort(), 2);
}

/**
 * Copy Watch Layout JSON to clipboard
 */
export async function copyLayoutToClipboard(layout: WatchLayoutJSON): Promise<boolean> {
  try {
    const json = toCanonicalJSON(layout);
    await navigator.clipboard.writeText(json);
    return true;
  } catch {
    return false;
  }
}
