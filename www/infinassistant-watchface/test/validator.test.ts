import { describe, expect, it } from 'vitest';
import { getTabBadgeCounts, isPublishable, listedMessages, validateConfig } from '../src/validator';
import {
  DASHBOARD_MAX_GLYPHS_PER_GROUP,
  DASHBOARD_MAX_SENSORS_PER_GROUP,
  DASHBOARD_MAX_SENSOR_GROUPS,
  DASHBOARD_MAX_STATUS_GROUPS,
  MAX_EVENTS,
  MAX_PRESENCE_ICONS,
  MAX_SCREENS,
  MAX_TILES_PER_SCREEN,
} from '../src/constants';
import type { CardConfig, ScreenConfig } from '../src/types';
import { baseConfig, fieldsOf, hassWith, validDashboard, validTile } from './fixtures';

/** The default configuration with the given screens. */
function withScreens(...screens: ScreenConfig[]): CardConfig {
  const config = baseConfig();
  config.screens = screens;
  return config;
}

describe('validateConfig — defaults', () => {
  it('accepts the default configuration with no messages at all', () => {
    const result = validateConfig(baseConfig());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.info).toEqual([]);
    expect(isPublishable(result)).toBe(true);
  });

  it('warns, without failing, when Home Assistant has no zone.home', () => {
    const result = validateConfig(baseConfig(), hassWith());
    expect(result.valid).toBe(true);
    expect(fieldsOf(result, 'warning')).toEqual(['presence.home_zone']);
    expect(result.warnings[0].tab).toBe('settings');
  });

  it('is silent when Home Assistant has every referenced entity', () => {
    const result = validateConfig(baseConfig(), hassWith('zone.home'));
    expect(result.warnings).toEqual([]);
  });

  it('groups messages under all five editor tabs', () => {
    const result = validateConfig(baseConfig());
    expect(Object.keys(result.byTab).sort()).toEqual(
      ['calendar', 'home_control', 'logbook', 'screens', 'settings']
    );
  });
});

describe('validateConfig — settings tab', () => {
  it('reports each invalid header and theme field', () => {
    const config = baseConfig();
    config.theme.preset = 'neon' as never;
    config.theme.accent = '#12345';
    config.version = 3;
    config.header.time.format = 'H:mm' as never;
    config.header.time.align = 'top' as never;

    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(isPublishable(result)).toBe(false);
    expect(fieldsOf(result, 'error')).toEqual([
      'theme.preset',
      'theme.accent',
      'version',
      'time.format',
      'time.align',
    ]);
    expect(result.errors.every((m) => m.tab === 'settings')).toBe(true);
  });

  it('accepts config version 2 and lowercase accent hex', () => {
    const config = baseConfig();
    config.version = 2;
    config.theme.accent = '#a1b2c3';
    expect(validateConfig(config).valid).toBe(true);
  });

  it('skips the accent check when no accent is set', () => {
    const config = baseConfig();
    delete config.theme.accent;
    expect(validateConfig(config).valid).toBe(true);
  });

  it('requires a well-formed home zone when presence is enabled', () => {
    const config = baseConfig();
    config.header.presence.home_zone = '';
    expect(fieldsOf(validateConfig(config), 'error')).toEqual(['presence.home_zone']);

    config.header.presence.home_zone = 'Zone.Home';
    expect(fieldsOf(validateConfig(config), 'error')).toEqual(['presence.home_zone']);
  });

  it('checks the long-away threshold format', () => {
    const config = baseConfig();
    config.header.presence.long_away_threshold = '24h';
    expect(fieldsOf(validateConfig(config), 'error')).toEqual(['presence.long_away_threshold']);

    config.header.presence.long_away_threshold = '100:00:00';
    expect(validateConfig(config).valid).toBe(true);
  });

  it(`allows at most ${MAX_PRESENCE_ICONS} presence icons`, () => {
    const config = baseConfig();
    const icon = { icon: 'car' as const, entity: 'person.alex', hide_if_unknown: false };
    config.header.presence.icons = Array.from({ length: MAX_PRESENCE_ICONS }, () => ({ ...icon }));
    expect(validateConfig(config).valid).toBe(true);

    config.header.presence.icons.push({ ...icon });
    expect(fieldsOf(validateConfig(config), 'error')).toEqual(['presence.icons']);
  });

  it('validates each presence icon', () => {
    const config = baseConfig();
    config.header.presence.icons = [
      { icon: 'door' as never, entity: 'person.alex', hide_if_unknown: false },
      { icon: 'car', entity: '', hide_if_unknown: false },
      { icon: 'car', entity: 'not an entity', hide_if_unknown: false },
      { icon: 'truck', entity: 'sensor.van', hide_if_unknown: false },
      { icon: 'person_male', entity: 'device_tracker.phone', hide_if_unknown: true },
    ];

    const result = validateConfig(config);
    expect(fieldsOf(result, 'error')).toEqual([
      'presence.icons[0].icon',
      'presence.icons[1].entity',
      'presence.icons[2].entity',
    ]);
    // A non-person, non-tracker entity is allowed but flagged.
    expect(fieldsOf(result, 'warning')).toEqual(['presence.icons[3].entity']);
  });

  it('warns about presence entities missing from Home Assistant', () => {
    const config = baseConfig();
    config.header.presence.icons = [{ icon: 'car', entity: 'person.alex', hide_if_unknown: false }];
    const result = validateConfig(config, hassWith('zone.home'));
    expect(fieldsOf(result, 'warning')).toEqual(['presence.icons[0].entity']);
  });

  it('skips every presence check when presence is disabled', () => {
    const config = baseConfig();
    config.header.presence.enabled = false;
    config.header.presence.home_zone = '';
    config.header.presence.long_away_threshold = 'never';
    config.header.presence.icons = [{ icon: 'door' as never, entity: '', hide_if_unknown: false }];
    expect(validateConfig(config, hassWith()).valid).toBe(true);
  });

  it('validates the status bar entity sources', () => {
    const config = baseConfig();
    config.status_bar.sources = {
      steps_entity: 'Steps',
      hr_entity: 'heart rate',
      notifications_entity: 'sensor.phone_notifications',
    };
    const result = validateConfig(config, hassWith('zone.home'));
    expect(fieldsOf(result, 'error')).toEqual(['sources.steps_entity', 'sources.hr_entity']);
    expect(fieldsOf(result, 'warning')).toEqual(['sources.notifications_entity']);
  });

  it('notes a status bar that is enabled with no indicators', () => {
    const config = baseConfig();
    Object.assign(config.status_bar, {
      battery: false,
      bluetooth: false,
      steps: false,
      heart_rate: false,
      notifications: false,
    });
    const result = validateConfig(config);
    expect(result.valid).toBe(true);
    expect(result.info).toHaveLength(1);
    expect(result.info[0]).toMatchObject({ tab: 'settings', field: undefined });
  });

  it('skips the status bar checks when the status bar is disabled', () => {
    const config = baseConfig();
    config.status_bar.enabled = false;
    config.status_bar.sources.steps_entity = 'Steps';
    expect(validateConfig(config).valid).toBe(true);
  });

  it('flags extreme update and refresh intervals without failing', () => {
    const config = baseConfig();
    config.advanced.min_update_interval_ms = 99;
    config.advanced.full_refresh_minutes = 0;
    let result = validateConfig(config);
    expect(result.valid).toBe(true);
    expect(fieldsOf(result, 'warning')).toEqual(['min_update_interval_ms', 'full_refresh_minutes']);

    config.advanced.min_update_interval_ms = 60001;
    config.advanced.full_refresh_minutes = 61;
    result = validateConfig(config);
    expect(fieldsOf(result, 'info')).toEqual(['min_update_interval_ms', 'full_refresh_minutes']);

    config.advanced.min_update_interval_ms = 100;
    config.advanced.full_refresh_minutes = 60;
    result = validateConfig(config);
    expect(result.warnings).toEqual([]);
    expect(result.info).toEqual([]);
  });
});

describe('validateConfig — calendar tab', () => {
  it('skips calendar checks while events are disabled', () => {
    const config = baseConfig();
    config.events.max_events = 99;
    expect(validateConfig(config).valid).toBe(true);
  });

  it('requires at least one calendar once events are enabled', () => {
    const config = baseConfig();
    config.events.enabled = true;
    const result = validateConfig(config);
    expect(fieldsOf(result, 'error')).toEqual(['calendars']);
    expect(result.errors[0].tab).toBe('calendar');
  });

  it('validates each calendar entity', () => {
    const config = baseConfig();
    config.events.enabled = true;
    config.events.calendars = ['Calendar.Work', 'sensor.calendar', 'calendar.home', 'calendar.work'];
    const result = validateConfig(config, hassWith('zone.home', 'calendar.home'));
    expect(fieldsOf(result, 'error')).toEqual(['calendars[0]', 'calendars[1]']);
    expect(fieldsOf(result, 'warning')).toEqual(['calendars[3]']);
  });

  it('checks max events, the soon window and the all-day option', () => {
    const config = baseConfig();
    config.events.enabled = true;
    config.events.calendars = ['calendar.home'];
    config.events.max_events = MAX_EVENTS;
    expect(validateConfig(config).valid).toBe(true);

    config.events.max_events = MAX_EVENTS + 1;
    config.events.soon_window = '1h';
    config.events.all_day = 'sometimes' as never;
    expect(fieldsOf(validateConfig(config), 'error')).toEqual(['max_events', 'soon_window', 'all_day']);

    config.events.max_events = -1;
    config.events.soon_window = '00:30:00';
    config.events.all_day = 'banner';
    expect(fieldsOf(validateConfig(config), 'error')).toEqual(['max_events']);
  });
});

describe('validateConfig — tiles', () => {
  it('ignores disabled tiles but notes when no legacy tile is enabled', () => {
    const config = baseConfig();
    config.tiles = [validTile({ enabled: false, label: '' })];
    const result = validateConfig(config);
    expect(result.valid).toBe(true);
    expect(result.info.map((m) => m.message)).toEqual(['No legacy tiles are enabled.']);
  });

  it('accepts a complete tile', () => {
    const config = baseConfig();
    config.tiles = [validTile()];
    const result = validateConfig(config, hassWith('zone.home', 'sensor.outside_temp'));
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('reports every invalid tile field', () => {
    const config = baseConfig();
    config.tiles = [
      validTile({
        label: ' ',
        displayMode: 'icon',
        icon: 'rocket' as never,
        type: 'gauge' as never,
        color: 'rainbow' as never,
        rules: [{ condition: '', color: 'purple' as never }],
        tap: 'double-tap' as never,
      }),
    ];
    expect(fieldsOf(validateConfig(config), 'error')).toEqual([
      'tiles[0].label',
      'tiles[0].icon',
      'tiles[0].type',
      'tiles[0].color',
      'tiles[0].rules[0].condition',
      'tiles[0].rules[0].color',
      'tiles[0].tap',
    ]);
  });

  it('only checks the icon of icon-mode tiles', () => {
    const config = baseConfig();
    config.tiles = [validTile({ displayMode: 'text', icon: 'rocket' as never })];
    expect(validateConfig(config).valid).toBe(true);
  });

  it('warns about labels longer than eight characters', () => {
    const config = baseConfig();
    config.tiles = [validTile({ label: 'Greenhouse' })];
    const result = validateConfig(config);
    expect(result.valid).toBe(true);
    expect(fieldsOf(result, 'warning')).toEqual(['tiles[0].label']);
  });

  it('requires an entity or a device', () => {
    const config = baseConfig();
    config.tiles = [validTile({ entity: '' })];
    expect(fieldsOf(validateConfig(config), 'error')).toEqual(['tiles[0].entity']);

    config.tiles = [validTile({ entity: '', device_id: 'abc123' })];
    expect(validateConfig(config).valid).toBe(true);

    config.tiles = [validTile({ entity: 'temperature' })];
    expect(fieldsOf(validateConfig(config), 'error')).toEqual(['tiles[0].entity']);
  });

  it('warns when the entity domain does not suit the tile type', () => {
    const config = baseConfig();
    config.tiles = [validTile({ type: 'cover_state', entity: 'light.porch' })];
    const result = validateConfig(config, hassWith('zone.home'));
    expect(result.valid).toBe(true);
    expect(fieldsOf(result, 'warning')).toEqual(['tiles[0].entity', 'tiles[0].entity']);
    expect(result.warnings[0].message).toContain('cover_state');
    expect(result.warnings[1].message).toContain('not found');
  });

  it('skips colour rules when colouring is disabled', () => {
    const config = baseConfig();
    config.tiles = [validTile({ color: 'disabled', rules: [{ condition: '', color: 'purple' as never }] })];
    expect(validateConfig(config).valid).toBe(true);
  });
});

describe('validateConfig — screens', () => {
  it(`allows at most ${MAX_SCREENS} screens`, () => {
    const tiles = (): ScreenConfig => ({ screenType: 'tiles', tiles: [] });
    const max = Array.from({ length: MAX_SCREENS }, tiles);
    expect(validateConfig(withScreens(...max)).valid).toBe(true);

    const result = validateConfig(withScreens(...max, tiles()));
    expect(fieldsOf(result, 'error')).toEqual(['screens']);
  });

  it('notes, at info level, that more than 4 screens needs watch firmware 2.4.100', () => {
    const tiles = (): ScreenConfig => ({ screenType: 'tiles', tiles: [] });
    const infos = (n: number) =>
      validateConfig(withScreens(...Array.from({ length: n }, tiles))).info.filter((m) =>
        m.message.includes('2.4.100')
      );
    expect(infos(4)).toEqual([]);
    expect(infos(5)).toHaveLength(1);
    expect(infos(MAX_SCREENS)).toHaveLength(1);
    expect(validateConfig(withScreens(...Array.from({ length: MAX_SCREENS }, tiles))).valid).toBe(true);
  });

  it('rejects unknown screen types', () => {
    const result = validateConfig(withScreens({ screenType: 'clock' as never }));
    expect(fieldsOf(result, 'error')).toEqual(['screens[0].screenType']);
  });

  it(`allows at most ${MAX_TILES_PER_SCREEN} tiles per screen and validates them`, () => {
    const full = { screenType: 'tiles' as const, tiles: Array.from({ length: MAX_TILES_PER_SCREEN }, () => validTile()) };
    expect(validateConfig(withScreens(full)).valid).toBe(true);

    const over = { screenType: 'tiles' as const, tiles: [...full.tiles, validTile({ label: '' })] };
    expect(fieldsOf(validateConfig(withScreens(over)), 'error')).toEqual([
      'screens[0].tiles',
      `tiles[${MAX_TILES_PER_SCREEN}].label`,
    ]);
  });

  it('warns about a dashboard screen with no dashboard configuration', () => {
    const result = validateConfig(withScreens({ screenType: 'dashboard' }));
    expect(result.valid).toBe(true);
    expect(fieldsOf(result, 'warning')).toEqual(['screens[0].dashboard']);
  });
});

describe('validateConfig — dashboard screens', () => {
  const prefix = 'screens[0].dashboard';

  it('accepts a valid dashboard when Home Assistant has its entities', () => {
    const hass = hassWith('zone.home', 'binary_sensor.front_door', 'sensor.living_room');
    const result = validateConfig(withScreens({ screenType: 'dashboard', dashboard: validDashboard() }), hass);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('cannot verify entities without Home Assistant, and says so', () => {
    const result = validateConfig(withScreens({ screenType: 'dashboard', dashboard: validDashboard() }));
    expect(result.valid).toBe(true);
    expect(fieldsOf(result, 'warning')).toEqual([
      `${prefix}.statusGroups[0].glyphs[0].entity`,
      `${prefix}.sensorGroups[0].sensors[0].entity`,
    ]);
  });

  it('warns about an empty dashboard', () => {
    const dashboard = { statusGroups: [], sensorGroups: [] };
    const result = validateConfig(withScreens({ screenType: 'dashboard', dashboard }));
    expect(fieldsOf(result, 'warning')).toEqual([prefix]);
  });

  it('enforces the firmware group and glyph limits', () => {
    const glyph = { symbol: 'D', entity: 'binary_sensor.door' };
    const group = { type: 'doors' as const, glyphs: [glyph] };
    const sensorGroup = {
      type: 'freezers' as const,
      sensors: Array.from({ length: DASHBOARD_MAX_SENSORS_PER_GROUP + 1 }, () => ({
        entity: 'sensor.freezer',
        displayType: 'temperature' as const,
      })),
    };
    const dashboard = validDashboard({
      statusGroups: [
        ...Array.from({ length: DASHBOARD_MAX_STATUS_GROUPS }, () => group),
        { type: 'lights', glyphs: [] },
        { type: 'lights', glyphs: Array.from({ length: DASHBOARD_MAX_GLYPHS_PER_GROUP + 1 }, () => glyph) },
      ],
      sensorGroups: Array.from({ length: DASHBOARD_MAX_SENSOR_GROUPS + 1 }, () => sensorGroup),
    });
    const hass = hassWith('zone.home', 'binary_sensor.door', 'sensor.freezer');
    const errors = fieldsOf(validateConfig(withScreens({ screenType: 'dashboard', dashboard }), hass), 'error');

    expect(errors).toContain(`${prefix}.statusGroups`);
    expect(errors).toContain(`${prefix}.statusGroups[${DASHBOARD_MAX_STATUS_GROUPS}].glyphs`);
    expect(errors).toContain(`${prefix}.statusGroups[${DASHBOARD_MAX_STATUS_GROUPS + 1}].glyphs`);
    expect(errors).toContain(`${prefix}.sensorGroups`);
    expect(errors).toContain(`${prefix}.sensorGroups[0].sensors`);
  });

  it('rejects unknown group types', () => {
    const dashboard = validDashboard({
      statusGroups: [{ type: 'windows' as never, glyphs: [{ symbol: 'W', entity: 'binary_sensor.window' }] }],
      sensorGroups: [{ type: 'humidity' as never, sensors: [] }],
    });
    const errors = fieldsOf(validateConfig(withScreens({ screenType: 'dashboard', dashboard })), 'error');
    expect(errors).toEqual([`${prefix}.statusGroups[0].type`, `${prefix}.sensorGroups[0].type`]);
  });

  it('checks glyph and sensor entities for presence, format and domain', () => {
    const dashboard = validDashboard({
      statusGroups: [{
        type: 'doors',
        glyphs: [
          { symbol: 'A', entity: '' },
          { symbol: 'B', entity: 'front door' },
          { symbol: 'C', entity: 'sensor.door_angle' },
        ],
      }],
      sensorGroups: [{
        type: 'beacons',
        sensors: [
          { entity: '', displayType: 'presence' },
          { entity: 'Sensor.X', displayType: 'presence' },
          { entity: 'light.lamp', displayType: 'presence' },
          { entity: 'device_tracker.keys', displayType: 'presence', symbol: 'K' },
        ],
      }],
    });
    const hass = hassWith('zone.home');
    const result = validateConfig(withScreens({ screenType: 'dashboard', dashboard }), hass);
    const glyphs = `${prefix}.statusGroups[0].glyphs`;
    const sensors = `${prefix}.sensorGroups[0].sensors`;
    expect(fieldsOf(result, 'error')).toEqual([
      `${glyphs}[0].entity`,
      `${glyphs}[1].entity`,
      `${glyphs}[2].entity`,
      `${sensors}[0].entity`,
      `${sensors}[1].entity`,
      `${sensors}[2].entity`,
    ]);
    expect(fieldsOf(result, 'warning')).toEqual([`${sensors}[3].entity`]);
  });

  it('warns, per glyph, about a symbol the watch shows as ? or cannot draw', () => {
    const dashboard = validDashboard({
      statusGroups: [
        { type: 'doors', glyphs: [{ symbol: 'F', entity: 'binary_sensor.front_door' }] },
        {
          type: 'lights',
          glyphs: [
            { symbol: 'BR', entity: 'binary_sensor.front_door' },
            { symbol: '', entity: 'binary_sensor.front_door' },
            { symbol: 'é', entity: '' },
          ],
        },
      ],
    });
    const hass = hassWith('zone.home', 'binary_sensor.front_door', 'sensor.living_room');
    const result = validateConfig(withScreens({ screenType: 'dashboard', dashboard }), hass);
    const glyphs = `${prefix}.statusGroups[1].glyphs`;

    expect(result.warnings.map((m) => [m.field, m.message])).toEqual([
      [`${glyphs}[0].symbol`, "Screen 1: status group 2, glyph 1: 'BR' shows as ? on the watch."],
      [`${glyphs}[1].symbol`, 'Screen 1: status group 2, glyph 2: an empty symbol shows as ? on the watch.'],
      [`${glyphs}[2].symbol`, "Screen 1: status group 2, glyph 3: the watch can't draw 'é'."],
    ]);
    // Warnings, not errors; the glyph's entity is still checked after its symbol.
    expect(fieldsOf(result, 'error')).toEqual([`${glyphs}[2].entity`]);
  });

  it('checks the calendars a dashboard picks', () => {
    const dashboard = validDashboard({
      events: [{ calendar: 'calendar.work' }, { calendar: 'sensor.agenda' }, { calendar: '' }, { calendar: 'calendar.gone' }],
    });
    const hass = hassWith('zone.home', 'binary_sensor.front_door', 'sensor.living_room', 'calendar.work');
    const result = validateConfig(withScreens({ screenType: 'dashboard', dashboard }), hass);
    expect(fieldsOf(result, 'error')).toEqual([`${prefix}.events[1].calendar`, `${prefix}.events[2].calendar`]);
    expect(fieldsOf(result, 'warning')).toEqual([`${prefix}.events[3].calendar`]);
    // None picked is valid: the dashboard reads the Calendar tab's calendars.
    expect(validateConfig(withScreens({ screenType: 'dashboard', dashboard: validDashboard() }), hass).errors).toEqual([]);
  });

  it('cannot verify the picked calendars without Home Assistant, and says so', () => {
    const dashboard = validDashboard({ events: [{ calendar: 'calendar.work' }, { calendar: 'sensor.agenda' }] });
    const result = validateConfig(withScreens({ screenType: 'dashboard', dashboard }));

    expect(fieldsOf(result, 'error')).toEqual([`${prefix}.events[1].calendar`]);
    expect(fieldsOf(result, 'warning')).toEqual([
      `${prefix}.statusGroups[0].glyphs[0].entity`,
      `${prefix}.sensorGroups[0].sensors[0].entity`,
      `${prefix}.events[0].calendar`,
    ]);
    expect(result.warnings[2].message).toBe(
      'Screen 1: unable to verify calendar "calendar.work" — HA connection not available.'
    );
  });

  it('reports events that are not a list, rather than throwing on them', () => {
    // YAML can make events a string, a mapping or a number.
    const hass = hassWith('zone.home', 'binary_sensor.front_door', 'sensor.living_room', 'calendar.work');
    const run = (events: unknown) =>
      validateConfig(withScreens({ screenType: 'dashboard', dashboard: validDashboard({ events: events as never }) }), hass);

    for (const events of ['calendar.work', { calendar: 'calendar.work' }, 3]) {
      const result = run(events);
      expect(fieldsOf(result, 'error')).toEqual([`${prefix}.events`]);
      expect(result.warnings).toEqual([]);
    }
    // Left out, or null as an empty YAML key gives: none picked, which is valid.
    expect(run(undefined).errors).toEqual([]);
    expect(run(null).errors).toEqual([]);
  });

  it('checks the weather entity', () => {
    const field = `${prefix}.weather.entity`;
    const run = (entity: string, hass = hassWith('zone.home', 'binary_sensor.front_door', 'sensor.living_room')) =>
      validateConfig(withScreens({ screenType: 'dashboard', dashboard: validDashboard({ weather: { entity } }) }), hass);

    expect(fieldsOf(run('Weather'), 'error')).toEqual([field]);
    expect(fieldsOf(run('sensor.forecast'), 'error')).toEqual([field]);
    expect(fieldsOf(run('weather.home'), 'warning')).toEqual([field]);
    const hass = hassWith('zone.home', 'binary_sensor.front_door', 'sensor.living_room', 'weather.home');
    expect(run('weather.home', hass).warnings).toEqual([]);
  });

  it('checks the configurable value and the inline metric slots', () => {
    const dashboard = validDashboard({
      configurableValue: { label: 'Electricity!', entity: 'sensor.power' },
      inlineMetrics: [{ label: 'PWR', entity: '' }, { label: 'T', entity: 'sensor.t' }],
    });
    const hass = hassWith('zone.home', 'binary_sensor.front_door', 'sensor.living_room');
    const result = validateConfig(withScreens({ screenType: 'dashboard', dashboard }), hass);
    expect(fieldsOf(result, 'error')).toEqual([`${prefix}.inlineMetrics[0].entity`]);
    expect(fieldsOf(result, 'warning')).toEqual([
      `${prefix}.configurableValue.entity`,
      `${prefix}.configurableValue.label`,
      `${prefix}.inlineMetrics[0].label`,
      `${prefix}.inlineMetrics[1].entity`,
    ]);
  });

  it('requires an entity for the configurable value', () => {
    const dashboard = validDashboard({ configurableValue: { entity: '' } });
    const errors = fieldsOf(validateConfig(withScreens({ screenType: 'dashboard', dashboard })), 'error');
    expect(errors).toEqual([`${prefix}.configurableValue.entity`]);
  });
});

describe('validateConfig — logbook and home control', () => {
  it('bounds hours back and max entries', () => {
    const config = baseConfig();
    config.logbook_app = { entities: ['sensor.door', ' '], hours_back: 49, max_entries: 0 };
    const result = validateConfig(config);
    expect(fieldsOf(result, 'error')).toEqual(['hours_back', 'max_entries']);
    expect(fieldsOf(result, 'warning')).toEqual(['entities[1]']);
    expect(result.errors.every((m) => m.tab === 'logbook')).toBe(true);

    config.logbook_app = { entities: [], hours_back: 48, max_entries: 15 };
    expect(validateConfig(config).valid).toBe(true);
    config.logbook_app = { entities: [], hours_back: 1, max_entries: 16 };
    expect(fieldsOf(validateConfig(config), 'error')).toEqual(['max_entries']);
  });

  it('allows at most four home control devices', () => {
    const config = baseConfig();
    const device = { entity_id: 'light.porch' };
    config.home_control = { devices: [device, device, device, { entity_id: ' ' }] };
    let result = validateConfig(config);
    expect(result.valid).toBe(true);
    expect(fieldsOf(result, 'warning')).toEqual(['devices[3].entity_id']);

    config.home_control.devices.push(device);
    result = validateConfig(config);
    expect(fieldsOf(result, 'error')).toEqual(['devices']);
    expect(result.errors[0].tab).toBe('home_control');
  });

  it('skips both sections when they are absent', () => {
    const config = baseConfig();
    delete config.logbook_app;
    delete config.home_control;
    expect(validateConfig(config).valid).toBe(true);
  });
});

describe('getTabBadgeCounts', () => {
  it('counts errors and warnings per tab and ignores info', () => {
    const config = baseConfig();
    config.theme.preset = 'neon' as never;                 // settings error
    config.advanced.full_refresh_minutes = 0;              // settings warning
    config.advanced.min_update_interval_ms = 70000;        // settings info
    config.events.enabled = true;                          // calendar error
    config.tiles = [validTile({ label: 'Greenhouse' })];   // screens warning
    config.logbook_app = { entities: [], hours_back: 0, max_entries: 10 }; // logbook error

    expect(getTabBadgeCounts(validateConfig(config))).toEqual({
      settings: { errors: 1, warnings: 1 },
      screens: { errors: 0, warnings: 1 },
      calendar: { errors: 1, warnings: 0 },
      logbook: { errors: 1, warnings: 0 },
      home_control: { errors: 0, warnings: 0 },
    });
  });
});

describe('listedMessages', () => {
  it('lists the errors, then the warnings, each with its tab and field, and no info', () => {
    const config = withScreens({
      screenType: 'dashboard',
      dashboard: validDashboard({ weather: { entity: 'sensor.forecast' } }),
    });
    config.theme.accent = '#12345';                        // settings error
    config.advanced.full_refresh_minutes = 90;             // settings info: not listed

    // Without Home Assistant the glyph and sensor entities cannot be verified: two warnings.
    const listed = listedMessages(validateConfig(config));
    const dash = 'screens[0].dashboard';
    expect(listed.map((m) => [m.severity, m.tabLabel, m.field])).toEqual([
      ['error', 'Settings', 'theme.accent'],
      ['error', 'Screens', `${dash}.weather.entity`],
      ['warning', 'Screens', `${dash}.statusGroups[0].glyphs[0].entity`],
      ['warning', 'Screens', `${dash}.sensorGroups[0].sensors[0].entity`],
    ]);
    expect(listed[1].message).toContain('must be in the weather.* domain');
  });

  it('lists nothing before the configuration is validated', () => {
    expect(listedMessages(null)).toEqual([]);
  });
});
