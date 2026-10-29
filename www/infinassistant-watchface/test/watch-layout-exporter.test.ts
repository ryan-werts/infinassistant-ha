import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  compressPayload,
  copyLayoutToClipboard,
  estimatePayloadSize,
  exportedGlyphSymbol,
  exportWatchLayout,
  glyphSymbolProblem,
  toCanonicalJSON,
} from '../src/watch-layout-exporter';
import {
  DASHBOARD_MAX_GLYPHS_PER_GROUP,
  DASHBOARD_MAX_SENSORS_PER_GROUP,
  DASHBOARD_MAX_SENSOR_GROUPS,
  DASHBOARD_MAX_STATUS_GROUPS,
  DEFAULT_ACCENT,
  DEFAULT_ACTIVE_COLOR,
  DEFAULT_INACTIVE_COLOR,
  THEME_BACKGROUNDS,
} from '../src/constants';
import type { ActionConfig, DashboardConfig, WatchLayoutDashboard } from '../src/types';
import { baseConfig, validDashboard, validTile } from './fixtures';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Export a config holding a single dashboard screen and return its dashboard. */
function exportDashboard(dashboard: DashboardConfig): WatchLayoutDashboard {
  const config = baseConfig();
  config.screens = [{ screenType: 'dashboard', dashboard }];
  const screen = exportWatchLayout(config).screens[0];
  expect(screen.screenType).toBe(0);
  return screen.dashboard as WatchLayoutDashboard;
}

describe('exportWatchLayout — top level', () => {
  it('exports the default configuration', () => {
    expect(exportWatchLayout(baseConfig())).toEqual({
      version: 2,
      theme: { background: THEME_BACKGROUNDS.charcoal, accent: DEFAULT_ACCENT },
      header: {
        time: { format: 'HH:mm', align: 'left' },
        presence: { enabled: true, homeZone: 'zone.home', longAwayThreshold: '24:00:00', icons: [] },
      },
      statusBar: {
        enabled: true,
        battery: { enabled: true, entity: null },
        bluetooth: { enabled: true, entity: null },
        steps: { enabled: true, entity: null },
        heartRate: { enabled: true, entity: null },
        notifications: { enabled: true, entity: null },
      },
      events: {
        enabled: false,
        calendars: [],
        maxEvents: 2,
        soonWindow: '01:00:00',
        showIfEmpty: false,
        allDay: 'show_all_day',
      },
      screens: [],
      defaultActiveColor: DEFAULT_ACTIVE_COLOR,
      defaultInactiveColor: DEFAULT_INACTIVE_COLOR,
      logbookApp: { entityIds: [], maxEntries: 10, hoursBack: 12 },
      homeControl: { devices: [] },
      tiles: [],
      actions: [],
    });
  });

  it('maps the theme preset and the colour overrides', () => {
    const config = baseConfig();
    config.theme = { preset: 'black', activeColor: '#00FF00', inactiveColor: '#333333' };
    const layout = exportWatchLayout(config);
    expect(layout.theme).toEqual({ background: '#000000', accent: DEFAULT_ACCENT });
    expect(layout.defaultActiveColor).toBe('#00FF00');
    expect(layout.defaultInactiveColor).toBe('#333333');
  });

  it('omits the logbook and home control blocks when they are not configured', () => {
    const config = baseConfig();
    delete config.logbook_app;
    delete config.home_control;
    const layout = exportWatchLayout(config);
    expect(layout).not.toHaveProperty('logbookApp');
    expect(layout).not.toHaveProperty('homeControl');
  });

  it('drops blank logbook entities and blank home control devices', () => {
    const config = baseConfig();
    config.logbook_app = { entities: ['binary_sensor.door', '  ', ''], hours_back: 6, max_entries: 5 };
    config.home_control = {
      devices: [
        { entity_id: 'light.porch', name: 'Porch', domain: 'light' },
        { entity_id: ' ' },
        { entity_id: 'lock.front', name: '', domain: '' },
      ],
    };
    const layout = exportWatchLayout(config);
    expect(layout.logbookApp).toEqual({ entityIds: ['binary_sensor.door'], maxEntries: 5, hoursBack: 6 });
    expect(layout.homeControl).toEqual({
      devices: [
        { entityId: 'light.porch', name: 'Porch', domain: 'light' },
        { entityId: 'lock.front', name: undefined, domain: undefined },
      ],
    });
  });
});

describe('exportWatchLayout — header and status bar', () => {
  it('exports a disabled presence block with fixed defaults', () => {
    const config = baseConfig();
    config.header.presence.enabled = false;
    config.header.presence.home_zone = 'zone.work';
    expect(exportWatchLayout(config).header.presence).toEqual({
      enabled: false,
      homeZone: '',
      longAwayThreshold: '24:00:00',
      icons: [],
    });
  });

  it('maps presence icons', () => {
    const config = baseConfig();
    config.header.presence.icons = [{ icon: 'car', entity: 'person.alex', hide_if_unknown: true }];
    expect(exportWatchLayout(config).header.presence.icons).toEqual([
      { type: 'car', entity: 'person.alex', hideIfUnknown: true },
    ]);
  });

  it('prefers the first dashboard screen\'s presence over the header presence', () => {
    const config = baseConfig();
    config.screens = [
      { screenType: 'tiles', tiles: [] },
      {
        screenType: 'dashboard',
        dashboard: validDashboard({
          presence: { enabled: true, home_zone: 'zone.cabin', long_away_threshold: '48:00:00', icons: [] },
        }),
      },
    ];
    expect(exportWatchLayout(config).header.presence).toMatchObject({
      homeZone: 'zone.cabin',
      longAwayThreshold: '48:00:00',
    });
  });

  it('exports only the enabled status bar indicators and their sources', () => {
    const config = baseConfig();
    Object.assign(config.status_bar, { battery: false, bluetooth: false, notifications: false });
    config.status_bar.sources.steps_entity = 'sensor.phone_steps';
    expect(exportWatchLayout(config).statusBar).toEqual({
      enabled: true,
      battery: undefined,
      bluetooth: undefined,
      steps: { enabled: true, entity: 'sensor.phone_steps' },
      heartRate: { enabled: true, entity: null },
      notifications: undefined,
    });
  });

  it('collapses a disabled status bar to a single flag', () => {
    const config = baseConfig();
    config.status_bar.enabled = false;
    expect(exportWatchLayout(config).statusBar).toEqual({ enabled: false });
  });
});

describe('exportWatchLayout — legacy tiles and actions', () => {
  it('exports enabled tiles that have an entity or a device', () => {
    const config = baseConfig();
    config.tiles = [
      validTile({
        label: 'Greenhouse',
        displayMode: 'icon',
        icon: 'fire',
        rules: [{ condition: '> 30', color: 'red' }],
        format: { prefix: '~', suffix: '', unit: 'C', uppercase: false },
      }),
      validTile({ enabled: false }),
      validTile({ entity: '' }),
      validTile({ entity: '', device_id: 'dev1', label: 'gate' }),
    ];
    const tiles = exportWatchLayout(config).tiles;
    expect(tiles).toHaveLength(2);
    expect(tiles?.[0]).toEqual({
      label: 'GREENHOU',
      icon: 'fire',
      displayMode: 1,
      device_id: undefined,
      entity: 'sensor.outside_temp',
      type: 'sensor_value',
      colorMode: 'auto',
      rules: [{ condition: '> 30', color: 'red' }],
      tap: 'none',
      format: { prefix: '~', suffix: '', unit: 'C', uppercase: false },
    });
    expect(tiles?.[1]).toMatchObject({ label: 'GATE', displayMode: 0, device_id: 'dev1', entity: '' });
  });

  it('exports enabled actions with their type-specific fields', () => {
    const action = (overrides: Partial<ActionConfig>): ActionConfig => ({
      enabled: true,
      label: 'Action',
      icon: 'light',
      entity: 'light.porch',
      action: 'toggle',
      state_color: true,
      ...overrides,
    });
    const dimmer = { step_percent: 10, swipe: true, longpress_overlay: false, on_brightness_default: 'last' as const, fixed_percent: 50 };
    const config = baseConfig();
    config.actions = [
      action({ label: 'Living room lamp', action: 'light.dimmer', dimmer }),
      action({ label: 'Off', enabled: false }),
      action({ label: 'Scene', action: 'service_call', domain: 'scene', service: 'turn_on' }),
      action({ label: 'Garage', action: 'device_action', device_id: 'dev9', device_action: 'open' }),
      action({ label: 'Lamp', dimmer }),
    ];
    const actions = exportWatchLayout(config).actions;
    expect(actions?.map((a) => a.label)).toEqual(['LIVING ROO', 'SCENE', 'GARAGE', 'LAMP']);
    expect(actions?.[0].dimmer).toEqual(dimmer);
    expect(actions?.[1]).toMatchObject({ actionType: 'service_call', domain: 'scene', service: 'turn_on' });
    expect(actions?.[2]).toMatchObject({ actionType: 'device_action', deviceId: 'dev9', deviceAction: 'open' });
    // Only the dimmer action carries dimmer settings.
    expect(actions?.[3].dimmer).toBeUndefined();
    expect(actions?.[3]).not.toHaveProperty('domain');
  });

  it('leaves out the legacy tiles and actions once screens are defined', () => {
    const config = baseConfig();
    config.tiles = [validTile()];
    config.screens = [{ screenType: 'tiles', tiles: [] }];
    const layout = exportWatchLayout(config);
    expect(layout).not.toHaveProperty('tiles');
    expect(layout).not.toHaveProperty('actions');
  });
});

describe('exportWatchLayout — screens', () => {
  it('exports a tiles screen with the default 2x2 layout', () => {
    const config = baseConfig();
    config.screens = [{ screenType: 'tiles', name: 'Garden', tiles: [validTile(), validTile({ enabled: false })] }];
    const [screen] = exportWatchLayout(config).screens;
    expect(screen.screenType).toBe(1);
    expect(screen.name).toBe('Garden');
    expect(screen.tileLayout).toBe(4);
    expect(screen.tiles).toHaveLength(1);
    expect(screen.dashboard).toBeUndefined();
  });

  it('exports a dashboard screen with no tiles', () => {
    const config = baseConfig();
    config.screens = [{ screenType: 'dashboard', dashboard: validDashboard() }];
    const [screen] = exportWatchLayout(config).screens;
    expect(screen.screenType).toBe(0);
    expect(screen.tiles).toEqual([]);
    expect(screen.dashboard).toEqual({
      statusGroups: [{ type: 'doors', glyphs: [{ symbol: 'F', entity: 'binary_sensor.front_door' }] }],
      sensorGroups: [{ type: 'thermostats', sensors: [{ entity: 'sensor.living_room', displayType: 'temperature', symbol: undefined }] }],
      weather: undefined,
      events: undefined,
      notifications: undefined,
      configurableValue: undefined,
      inlineMetrics: undefined,
    });
  });
});

describe('exportWatchLayout — dashboard limits and defaults', () => {
  it('truncates over-limit collections to the firmware limits and warns once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const glyph = { symbol: 'D', entity: 'binary_sensor.door' };
    const sensor = { entity: 'sensor.t', displayType: 'temperature' as const };
    const dashboard = exportDashboard({
      statusGroups: Array.from({ length: DASHBOARD_MAX_STATUS_GROUPS + 2 }, () => ({
        type: 'doors' as const,
        glyphs: Array.from({ length: DASHBOARD_MAX_GLYPHS_PER_GROUP + 3 }, () => glyph),
      })),
      sensorGroups: Array.from({ length: DASHBOARD_MAX_SENSOR_GROUPS + 1 }, () => ({
        type: 'thermostats' as const,
        sensors: Array.from({ length: DASHBOARD_MAX_SENSORS_PER_GROUP + 1 }, () => sensor),
      })),
    });

    expect(dashboard.statusGroups).toHaveLength(DASHBOARD_MAX_STATUS_GROUPS);
    expect(dashboard.statusGroups.every((g) => g.glyphs.length === DASHBOARD_MAX_GLYPHS_PER_GROUP)).toBe(true);
    expect(dashboard.sensorGroups).toHaveLength(DASHBOARD_MAX_SENSOR_GROUPS);
    expect(dashboard.sensorGroups.every((g) => g.sensors.length === DASHBOARD_MAX_SENSORS_PER_GROUP)).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('does not warn for a dashboard within the limits', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    exportDashboard(validDashboard());
    expect(warn).not.toHaveBeenCalled();
  });

  it('replaces empty and multi-character glyph symbols with "?"', () => {
    const dashboard = exportDashboard(validDashboard({
      statusGroups: [{
        type: 'lights',
        glyphs: [
          { symbol: 'K', entity: 'light.kitchen' },
          { symbol: '', entity: 'light.hall' },
          { symbol: 'BR', entity: 'light.bedroom' },
        ],
      }],
    }));
    expect(dashboard.statusGroups[0].glyphs.map((g) => g.symbol)).toEqual(['K', '?', '?']);
  });

  it('says what the watch makes of each symbol it does not draw as typed', () => {
    // Shown as "?": the export replaces them (FR-26). An emoji is two UTF-16 units.
    expect(glyphSymbolProblem('')).toBe('an empty symbol shows as ? on the watch');
    expect(glyphSymbolProblem(undefined)).toBe('an empty symbol shows as ? on the watch');
    expect(glyphSymbolProblem('BR')).toBe("'BR' shows as ? on the watch");
    expect(glyphSymbolProblem('\u{1F6AA}')).toBe("'\u{1F6AA}' shows as ? on the watch");
    // Not drawn at all: past ASCII (the firmware), blank (the app), '#' (the dashboard).
    expect(glyphSymbolProblem('é')).toBe("the watch can't draw 'é'");
    expect(glyphSymbolProblem('✓')).toBe("the watch can't draw '✓'");
    expect(glyphSymbolProblem(' ')).toBe("the watch can't draw ' '");
    expect(glyphSymbolProblem('#')).toBe("the watch can't draw '#'");
    // Drawn as typed.
    for (const symbol of ['F', 'k', '7', '?', '*']) expect(glyphSymbolProblem(symbol)).toBeNull();
  });

  it('exports a symbol as "?" exactly when it is said to show as "?"', () => {
    for (const symbol of ['', 'F', 'BR', 'é', '#', '\u{1F6AA}']) {
      const shownAsQuestionMark = glyphSymbolProblem(symbol)?.includes('shows as ?') ?? false;
      expect(exportedGlyphSymbol(symbol) === '?' && symbol !== '?').toBe(shownAsQuestionMark);
    }
  });

  it('exports weather, calendars and notification sources', () => {
    const dashboard = exportDashboard(validDashboard({
      weather: { entity: 'weather.home' },
      events: [{ calendar: 'calendar.family' }],
      notifications: [{ source: 'Phone' }, { source: '' }],
    }));
    expect(dashboard.weather).toEqual({ entity: 'weather.home' });
    expect(dashboard.events).toEqual([{ calendar: 'calendar.family' }]);
    expect(dashboard.notifications).toEqual([{ source: 'Phone' }, { source: 'HA' }]);
  });

  it('exports no calendars, rather than throwing, when events is not a list', () => {
    // YAML can make events anything; the validator reports what is not a list.
    for (const events of ['calendar.family', { calendar: 'calendar.family' }]) {
      expect(exportDashboard(validDashboard({ events: events as never })).events).toBeUndefined();
    }
    expect(exportDashboard(validDashboard({ events: [null as never] })).events).toEqual([{ calendar: undefined }]);
  });

  it('omits weather when no weather entity is set', () => {
    expect(exportDashboard(validDashboard({ weather: { entity: '' } })).weather).toBeUndefined();
  });

  it('truncates the configurable value label and defaults truncateTo to 19', () => {
    const dashboard = exportDashboard(validDashboard({
      configurableValue: { label: 'Electricity use', entity: 'sensor.power' },
    }));
    expect(dashboard.configurableValue).toEqual({ label: 'Electricity', entity: 'sensor.power', truncateTo: 19 });

    const custom = exportDashboard(validDashboard({ configurableValue: { entity: 'sensor.power', truncateTo: 8 } }));
    expect(custom.configurableValue).toEqual({ label: '', entity: 'sensor.power', truncateTo: 8 });

    expect(exportDashboard(validDashboard({ configurableValue: { entity: '' } })).configurableValue).toBeUndefined();
  });

  it('exports the two inline metric slots, null for an empty slot', () => {
    const dashboard = exportDashboard(validDashboard({
      inlineMetrics: [undefined, { label: 'Temp', entity: 'sensor.t', round: true }],
    }));
    expect(dashboard.inlineMetrics).toEqual([null, { label: 'Te', entity: 'sensor.t', round: true }]);

    const none = exportDashboard(validDashboard({ inlineMetrics: [{ entity: '' }, undefined] }));
    expect(none.inlineMetrics).toBeUndefined();
  });
});

describe('payload helpers', () => {
  it('measures the payload in UTF-8 bytes', () => {
    const config = baseConfig();
    const ascii = estimatePayloadSize(exportWatchLayout(config));
    config.events.calendars = ['é'];
    // 'é' is one character but two UTF-8 bytes; the quotes add two more.
    expect(estimatePayloadSize(exportWatchLayout(config))).toBe(ascii + 4);
  });

  it('encodes the JSON payload as bytes', () => {
    const layout = exportWatchLayout(baseConfig());
    const bytes = compressPayload(layout);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(estimatePayloadSize(layout));
    expect(JSON.parse(new TextDecoder().decode(bytes))).toEqual(JSON.parse(JSON.stringify(layout)));
  });

  it('orders the top-level keys of the canonical JSON alphabetically', () => {
    const json = toCanonicalJSON(exportWatchLayout(baseConfig()));
    const keys = Object.keys(JSON.parse(json));
    expect(keys).toEqual([...keys].sort());
    expect(JSON.parse(json).version).toBe(2);
  });

  // Known defect: toCanonicalJSON passes the sorted top-level keys to
  // JSON.stringify as a replacer array, which is an allow-list applied at every
  // depth, so nested objects lose every key that is not also a top-level key
  // (theme comes out as {}). The card's "Copy JSON" button copies this output.
  // Remove `.fails` once nested keys survive.
  it.fails('keeps nested keys in the canonical JSON', () => {
    const layout = exportWatchLayout(baseConfig());
    expect(JSON.parse(toCanonicalJSON(layout))).toEqual(JSON.parse(JSON.stringify(layout)));
  });

  it('copies the canonical JSON to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const layout = exportWatchLayout(baseConfig());
    await expect(copyLayoutToClipboard(layout)).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith(toCanonicalJSON(layout));
  });

  it('reports a clipboard failure instead of throwing', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    await expect(copyLayoutToClipboard(exportWatchLayout(baseConfig()))).resolves.toBe(false);
  });
});
