import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { HassEntity, WatchLayoutDashboard, WatchLayoutJSON } from '../src/types';
import {
  DASH_CALM,
  DASH_CYAN,
  DASH_GREY,
  DASH_WHITE,
  SLOT_COLOR,
  STALE_CHECK,
  STALE_PILL,
  attributeEvents,
  batteryIcon,
  calendarEvents,
  cutUtf8,
  dashboardCalendars,
  dashboardPreview,
  dotTitle,
  eventLines,
  eventStartSec,
  forecastHiLo,
  formatClock,
  formatCountdown,
  formatEventStart,
  formatHeartRate,
  keptGlyphs,
  legacyHiLo,
  litGlyphs,
  m14Width,
  pillX,
  presence,
  reading,
  statusStrip,
  upcomingEvents,
  weatherIcon,
  type DashEvent,
  type DashPreview,
} from '../src/dashboard-preview';

// The preview draws the dashboard as firmware 2.4.98 does (HomeAssistant.cpp "dashboard v8",
// docs/face_dashboard/v8/design-spec.md), from the states the app sends it (DashboardStateBuilder.kt).

const entity = (entityId: string, state: string, attributes: Record<string, unknown> = {}): HassEntity => ({
  entity_id: entityId,
  state,
  attributes,
  last_changed: '',
  last_updated: '',
});

const group = (type: string, symbols: readonly string[] | string) => ({
  type,
  glyphs: [...symbols].map((symbol, i) => ({ symbol, entity: `binary_sensor.${type}_${i}` })),
});

/** The owner's dashboard, its groups in the layout's order: doors F S M D D, garage ? ?, motion M D K, lights P K W, media L H M ?. */
const ownerDash: WatchLayoutDashboard = {
  statusGroups: [group('doors', 'FSMDD'), group('garage', '??'), group('motion', 'MDK'), group('lights', 'PKW'), group('media', 'LHM?')],
  sensorGroups: [
    { type: 'thermostats', sensors: [{ entity: 'climate.main', displayType: 'temperature' }, { entity: 'sensor.attic', displayType: 'temperature' }] },
    { type: 'freezers', sensors: [{ entity: 'sensor.f1', displayType: 'temperature' }, { entity: 'sensor.f2', displayType: 'temperature' }] },
    { type: 'beacons', sensors: [{ entity: 'device_tracker.a', displayType: 'presence' }, { entity: 'device_tracker.b', displayType: 'presence' }, { entity: 'device_tracker.c', displayType: 'presence' }] },
  ],
  weather: { entity: 'weather.home' },
};

const layout: Pick<WatchLayoutJSON, 'events' | 'header'> = {
  events: { enabled: true, calendars: ['calendar.work', 'calendar.home', 'calendar.holidays'], maxEvents: 2, soonWindow: '01:00:00', showIfEmpty: false, allDay: 'show_all_day' },
  header: { time: { format: 'HH:mm', align: 'left' }, presence: { enabled: false, icons: [] } },
} as unknown as Pick<WatchLayoutJSON, 'events' | 'header'>;

const now = new Date(2026, 9, 12, 10, 9, 0); // Monday 12 October 2026, 10:09 local
const nowSec = Math.floor(now.getTime() / 1000);

/** The glyphs on, by entity. */
const onSet = (...ids: string[]) => {
  const on = new Set(ids);
  return (id: string) => on.has(id);
};

const letters = (p: { pills: { letter: string }[] }) => p.pills.map((x) => x.letter).join('');

describe('dashboard preview: the strip of pills', () => {
  it('keeps the glyphs the watch keeps: one ASCII character each, ten at most', () => {
    const glyphs = [...'ABCDEFGHIJKL'].map((symbol) => ({ symbol, entity: 'x' }));
    expect(keptGlyphs(glyphs).map((g) => g.symbol).join('')).toBe('ABCDEFGHIJ');
    expect(keptGlyphs([{ symbol: 'Fr', entity: 'x' }, { symbol: 'é', entity: 'x' }, { symbol: 'B', entity: 'x' }]).map((g) => g.symbol)).toEqual(['B']);
  });

  it('packs what is on left to right in type order, whatever the layout order: doors, garage, lights, media, motion', () => {
    const isOn = onSet('binary_sensor.doors_1', 'binary_sensor.garage_0', 'binary_sensor.lights_0', 'binary_sensor.lights_1',
      'binary_sensor.media_1', 'binary_sensor.motion_0');
    const strip = statusStrip(litGlyphs(ownerDash.statusGroups, isOn), false);
    // A door is open: slot 0 holds the first door pill, and there is no check.
    expect(strip.check).toBeNull();
    expect(strip.pills).toEqual([
      { letter: 'S', slot: 0, fill: SLOT_COLOR.doors },
      { letter: '?', slot: 1, fill: SLOT_COLOR.garage },
      { letter: 'P', slot: 2, fill: SLOT_COLOR.lights },
      { letter: 'K', slot: 3, fill: SLOT_COLOR.lights },
      { letter: 'H', slot: 4, fill: SLOT_COLOR.media },
      { letter: 'M', slot: 5, fill: SLOT_COLOR.motion },
    ]);
    expect(strip.pills.map((x) => pillX(x.slot))).toEqual([6, 29, 52, 75, 98, 121]);
  });

  it('shows the dim green check in slot 0 when every door and garage door is shut, the pills from slot 1', () => {
    const strip = statusStrip(litGlyphs(ownerDash.statusGroups, onSet('binary_sensor.lights_1', 'binary_sensor.motion_0')), false);
    expect(strip.check).toBe(DASH_CALM);
    expect(strip.pills.map((x) => [x.letter, x.slot])).toEqual([['K', 1], ['M', 2]]);
    // Nothing on at all: the check alone.
    const calm = statusStrip(litGlyphs(ownerDash.statusGroups, () => false), false);
    expect([calm.check, calm.pills]).toEqual([DASH_CALM, []]);
    // An open garage door alone answers "no" too.
    expect(statusStrip(litGlyphs(ownerDash.statusGroups, onSet('binary_sensor.garage_1')), false).check).toBeNull();
  });

  it('gives the check way when it and ten pills are both due (the strip is saturated)', () => {
    // Every light, media and motion glyph on (3 + 4 + 3 = 10) while the doors are shut.
    const all = (id: string) => !id.includes('doors') && !id.includes('garage');
    const saturated = statusStrip(litGlyphs(ownerDash.statusGroups, all), false);
    expect(saturated.check).toBeNull();
    expect(letters(saturated)).toBe('PKWLHM?MDK');
    expect(saturated.pills.map((x) => x.slot)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(pillX(9) + 20).toBe(233); // the tenth pill ends at x 233
    // Nine: the check and the nine fit.
    const nine = statusStrip(litGlyphs(ownerDash.statusGroups, (id) => all(id) && id !== 'binary_sensor.motion_2'), false);
    expect(nine.check).toBe(DASH_CALM);
    expect(nine.pills.map((x) => x.slot)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    // More than ten on: the first ten in type order, the doors among them.
    const everything = statusStrip(litGlyphs(ownerDash.statusGroups, () => true), false);
    expect([everything.check, letters(everything)]).toEqual([null, 'FSMDD??PKW']);
  });

  it('packs two groups of one type together in the layout order, and any other type with media', () => {
    const groups = [group('lights', 'AB'), group('motion', 'Z'), group('sensors', 'X'), group('lights', 'C'), group('media', 'Y')];
    expect(letters(statusStrip(litGlyphs(groups, () => true), false))).toBe('ABCXYZ');
    // '#' never lights (the watch's recolour escape), nor does a glyph without an entity.
    expect(litGlyphs([{ type: 'lights', glyphs: [{ symbol: '#', entity: 'a' }, { symbol: 'Q', entity: '' }] }], () => true)).toEqual([]);
  });

  it('lights a glyph for the same states as the app, a door in motion included', () => {
    const states: Record<string, HassEntity> = {
      'binary_sensor.garage_0': entity('binary_sensor.garage_0', 'opening'),
      'binary_sensor.garage_1': entity('binary_sensor.garage_1', 'closed'),
      'binary_sensor.media_3': entity('binary_sensor.media_3', 'paused'),
    };
    const p = dashboardPreview(ownerDash, layout, (id) => states[id], now, null);
    expect(letters(p)).toBe('?');
    expect(p.check).toBeNull();
  });

  it('greys the house status when the live state is stale: grey pills, the faint check, grey thermostats', () => {
    const states: Record<string, HassEntity> = {
      'binary_sensor.lights_0': entity('binary_sensor.lights_0', 'on'),
      'binary_sensor.media_0': entity('binary_sensor.media_0', 'playing'),
      'climate.main': entity('climate.main', 'heat', { current_temperature: 71 }),
      'weather.home': entity('weather.home', 'sunny', { temperature: 60 }),
    };
    const fresh = dashboardPreview(ownerDash, layout, (id) => states[id], now, [70, 50]);
    expect([fresh.check, fresh.pills.map((x) => x.fill), fresh.thermostatColor]).toEqual([DASH_CALM, [SLOT_COLOR.lights, SLOT_COLOR.media], DASH_WHITE]);
    const stale = dashboardPreview(ownerDash, layout, (id) => states[id], now, [70, 50], { stale: true });
    expect(stale.stale).toBe(true);
    expect(stale.check).toBe(STALE_CHECK);
    expect(STALE_CHECK).toBe('#48484A');
    expect(stale.pills.map((x) => x.fill)).toEqual([STALE_PILL, STALE_PILL]);
    expect(STALE_PILL).toBe('#8E8E93');
    expect(stale.thermostatColor).toBe(DASH_GREY);
    // The letters, the time, the date and the weather stay as they are.
    expect(letters(stale)).toBe('PL');
    expect([stale.clock, stale.date, stale.weatherIcon, stale.weatherTemp, stale.hiLo]).toEqual([fresh.clock, fresh.date, fresh.weatherIcon, fresh.weatherTemp, fresh.hiLo]);
  });
});

describe('dashboard preview: the sensors and the weather', () => {
  it('reads the sensors as the app does', () => {
    expect(reading('climate.main', entity('climate.main', 'heat', { current_temperature: 71.6 }))).toBe(72);
    expect(reading('sensor.attic', entity('sensor.attic', '68.2'))).toBe(68);
    expect(reading('sensor.f', entity('sensor.f', 'unavailable'))).toBeNull();
    expect(presence(entity('device_tracker.a', 'home'))).toBe(1);
    expect(presence(entity('device_tracker.a', 'not_home'))).toBe(0);
    expect(presence(entity('person.a', 'Work'))).toBe(0);
    expect(presence(entity('device_tracker.a', 'unavailable'))).toBeNull();
    expect(presence(undefined)).toBeNull();
  });

  it('writes two thermostats, the number at home and the freezer bar\'s text', () => {
    const states: Record<string, HassEntity> = {
      'climate.main': entity('climate.main', 'heat', { current_temperature: 71.4 }),
      'sensor.attic': entity('sensor.attic', '-12.2', { unit_of_measurement: '°F' }),
      'sensor.f1': entity('sensor.f1', '17.4', { unit_of_measurement: '°F' }),
      'sensor.f2': entity('sensor.f2', '-2', { unit_of_measurement: '°F' }),
      'device_tracker.a': entity('device_tracker.a', 'home'),
      'device_tracker.b': entity('device_tracker.b', 'not_home'),
    };
    const p = dashboardPreview(ownerDash, layout, (id) => states[id], now, null);
    expect(p.thermostats).toBe('71° -12°');
    expect(p.home).toBe(1);
    expect(p.freezer).toBe('!17°');

    // Celsius: -9 is the line. A freezer with no reading: "!--" when none alarms.
    const cold: Record<string, HassEntity> = {
      'sensor.f1': entity('sensor.f1', '-10', { unit_of_measurement: '°C' }),
    };
    const q = dashboardPreview(ownerDash, layout, (id) => cold[id], now, null);
    expect(q.freezer).toBe('!--');
    expect(q.home).toBeNull();
    expect(q.thermostats).toBe('');
    // Both freezers fine: no bar.
    const fine = { 'sensor.f1': entity('sensor.f1', '-4'), 'sensor.f2': entity('sensor.f2', '2') };
    expect(dashboardPreview(ownerDash, layout, (id) => fine[id as keyof typeof fine], now, null).freezer).toBeNull();
    // Three thermostats: the first two show.
    const three: WatchLayoutDashboard = {
      ...ownerDash,
      sensorGroups: [{ type: 'thermostats', sensors: ['a', 'b', 'c'].map((s) => ({ entity: `sensor.${s}`, displayType: 'temperature' })) }],
    };
    const temps = { 'sensor.a': entity('sensor.a', '70'), 'sensor.b': entity('sensor.b', '68'), 'sensor.c': entity('sensor.c', '66') };
    expect(dashboardPreview(three, layout, (id) => temps[id as keyof typeof temps], now, null).thermostats).toBe('70° 68°');
  });

  it('shows the weather as an icon, the temperature and today\'s high and low', () => {
    expect(weatherIcon('partlycloudy')).toBe('mdi:weather-partly-cloudy');
    expect(weatherIcon('clear-night')).toBe('mdi:weather-sunny');
    expect(weatherIcon('unavailable')).toBeNull();
    const states = { 'weather.home': entity('weather.home', 'cloudy', { temperature: 58.4 }) };
    const p = dashboardPreview(ownerDash, layout, (id) => states[id as keyof typeof states], now, [65, 48]);
    expect([p.weatherIcon, p.weatherTemp, p.hiLo]).toEqual(['mdi:weather-cloudy', 58, '65/48']);
    const none = dashboardPreview(ownerDash, layout, () => undefined, now, [65, 48]);
    expect([none.weatherIcon, none.weatherTemp, none.hiLo]).toEqual([null, null, null]);
  });

  it('reads the high and low from get_forecasts, or from the old forecast attribute', () => {
    const result = { response: { 'weather.home': { forecast: [{ temperature: 64.6, templow: 47.5 }, { temperature: 70, templow: 50 }] } } };
    expect(forecastHiLo(result, 'weather.home')).toEqual([65, 48]);
    expect(forecastHiLo({ response: {} }, 'weather.home')).toBeNull();
    expect(forecastHiLo(null, 'weather.home')).toBeNull();
    expect(legacyHiLo(entity('weather.home', 'sunny', { forecast: [{ temperature: 80, templow: 60 }] }))).toEqual([80, 60]);
    expect(legacyHiLo(entity('weather.home', 'sunny'))).toBeNull();
  });

  it('picks the battery icon by level, as the design draws it', () => {
    expect([100, 90, 89, 60, 59, 35, 34, 10, 9, 0].map(batteryIcon)).toEqual([
      'mdi:battery', 'mdi:battery', 'mdi:battery-70', 'mdi:battery-70', 'mdi:battery-50', 'mdi:battery-50',
      'mdi:battery-20', 'mdi:battery-20', 'mdi:battery-outline', 'mdi:battery-outline',
    ]);
  });
});

describe('dashboard preview: the events', () => {
  it('counts down to an event as the watch does', () => {
    const at = 1_800_000_000;
    expect(formatCountdown(at, at)).toBe('now');
    expect(formatCountdown(at + 12 * 60, at)).toBe('12m');
    expect(formatCountdown(at + 60 * 60, at)).toBe('1.0h');
    expect(formatCountdown(at + 81 * 60, at)).toBe('1.3h');
    expect(formatCountdown(at + 372 * 60, at)).toBe('6.2h');
    expect(formatCountdown(at + 12 * 3600, at)).toBe('12h');
  });

  it('writes a start later today, or one under way, as the countdown; one on another day as its weekday and 24-hour time', () => {
    const at = (d: number, h: number, m: number) => Math.floor(new Date(2026, 9, d, h, m).getTime() / 1000);
    // Monday 12 October, 10:09.
    expect(formatEventStart(nowSec - 5 * 60, nowSec)).toBe('now'); // under way, inside the grace
    expect(formatEventStart(nowSec, nowSec)).toBe('now');
    expect(formatEventStart(nowSec + 12 * 60, nowSec)).toBe('12m');
    expect(formatEventStart(nowSec + 78 * 60, nowSec)).toBe('1.3h');
    expect(formatEventStart(nowSec + 372 * 60, nowSec)).toBe('6.2h');
    expect(formatEventStart(at(12, 23, 59), nowSec)).toBe('13h'); // the last minute of today
    // Tomorrow, however soon: the weekday.
    expect(formatEventStart(at(13, 0, 0), nowSec)).toBe('Tue 0:00');
    expect(formatEventStart(at(13, 9, 0), nowSec)).toBe('Tue 9:00');
    expect(formatEventStart(at(14, 9, 0), nowSec)).toBe('Wed 9:00');
    expect(formatEventStart(at(18, 10, 30), nowSec)).toBe('Sun 10:30');
    expect(formatEventStart(at(15, 21, 5), nowSec)).toBe('Thu 21:05');
    // Just past midnight, an event that began yesterday and is still shown: "now".
    expect(formatEventStart(at(12, 23, 58), at(13, 0, 3))).toBe('now');
    expect(formatEventStart(at(13, 0, 30), at(12, 23, 50))).toBe('Tue 0:30'); // 40 min ahead, but tomorrow
  });

  it('writes the heart rate, "--" without a reading', () => {
    expect([formatHeartRate(72), formatHeartRate(188), formatHeartRate(0)]).toEqual(['72', '188', '--']);
  });

  it('starts event 1 in cyan and event 2 in grey, and dots a title at 146 px as LONG_DOT does', () => {
    const lines = eventLines([
      { startSec: nowSec, title: 'Birthday dinner at Gina\'s' },
      { startSec: nowSec + 6 * 86400, title: 'Costco run and propane refill' },
    ], nowSec);
    expect(lines).toEqual([
      { start: 'now', startColor: DASH_CYAN, title: 'Birthday dinner at...' },
      { start: 'Sun 10:09', startColor: DASH_GREY, title: 'Costco run and pr...' },
    ]);
    // The design's worst case: 24 characters, about 17 survive.
    expect(dotTitle('Parent teacher conferenc')).toBe('Parent teacher co...');
    expect(m14Width('Parent teacher co...')).toBeLessThanOrEqual(146);
    expect(dotTitle('Soccer practice')).toBe('Soccer practice');
    // The widest start, "Wed 10:30", is 73 px: it clears the title column at x 88.
    expect(m14Width('Wed 10:30')).toBe(73);
    // No title: "event", as the watch writes it.
    expect(eventLines([{ startSec: nowSec + 600, title: '' }], nowSec)[0].title).toBe('event');
  });

  it('takes the dashboard\'s calendars as the app does', () => {
    // Every calendar of the face, though it shows two events (maxEvents), as the app reads them.
    expect(dashboardCalendars(ownerDash, layout)).toEqual(['calendar.work', 'calendar.home', 'calendar.holidays']);
    expect(dashboardCalendars({ ...ownerDash, events: [{ calendar: 'calendar.own' }] }, layout)).toEqual(['calendar.own']);
    const four = ['calendar.a', 'calendar.b', 'calendar.c', 'calendar.d'];
    expect(dashboardCalendars({ ...ownerDash, events: [...four, 'calendar.a', ''].map((calendar) => ({ calendar })) }, layout)).toEqual(four);
    expect(dashboardCalendars(ownerDash, { events: { ...layout.events, enabled: false } })).toEqual([]);
  });

  it('reads the events from get_events: the first eight of each calendar, all-day ones without a start', () => {
    expect(eventStartSec('2026-10-12T11:30:00')).toBe(Math.floor(new Date(2026, 9, 12, 11, 30).getTime() / 1000));
    expect(eventStartSec('2026-10-12 11:30:00')).toBe(Math.floor(new Date(2026, 9, 12, 11, 30).getTime() / 1000));
    expect(eventStartSec('2026-10-12T17:30:00+00:00')).toBe(Date.UTC(2026, 9, 12, 17, 30) / 1000);
    expect(eventStartSec('2026-10-12')).toBe(0);
    expect(eventStartSec(undefined)).toBe(0);

    const work = Array.from({ length: 10 }, (_, i) => ({ start: `2026-10-${13 + i}T09:00:00`, end: '', summary: `W${i}` }));
    const result = { response: {
      'calendar.work': { events: work },
      'calendar.home': { events: [{ start: '2026-10-12', end: '2026-10-13', summary: 'Holiday' }, { start: '2026-10-12T10:30:00', summary: 'Standup' }] },
    } };
    const events = calendarEvents(result, ['calendar.work', 'calendar.home', 'calendar.missing']);
    expect(events?.length).toBe(10);
    expect(events?.slice(7, 10).map((e) => e.title)).toEqual(['W7', 'Holiday', 'Standup']);
    expect(events?.[8].startSec).toBe(0);
    expect(calendarEvents({ response: {} }, ['calendar.work'])).toBeNull();
    expect(calendarEvents(null, ['calendar.work'])).toBeNull();
  });

  it('shows the two earliest timed events, one under way for up to 10 minutes included, as the app picks them', () => {
    const at = (h: number, m: number) => Math.floor(new Date(2026, 9, 12, h, m).getTime() / 1000);
    const candidates: DashEvent[] = [
      { startSec: at(11, 30), title: 'Design review with the whole team' },
      { startSec: 0, title: 'Holiday' },
      { startSec: at(9, 0), title: 'Gone' },
      { startSec: at(10, 5), title: 'Standup' },
      { startSec: at(10, 5), title: 'Standup' },
      { startSec: at(14, 0), title: 'Later' },
    ];
    expect(upcomingEvents(candidates, nowSec)).toEqual([
      { startSec: at(10, 5), title: 'Standup' },
      { startSec: at(11, 30), title: 'Design review with the w' }, // cut to 24 bytes
    ]);
    // 10 minutes after its start the standup is gone.
    expect(upcomingEvents(candidates, at(10, 16)).map((e) => e.title)).toEqual(['Design review with the w', 'Later']);
  });

  it('takes each calendar entity\'s event when get_events was not read', () => {
    const states: Record<string, HassEntity> = {
      'calendar.work': entity('calendar.work', 'off', { message: 'Design review', start_time: '2026-10-12 11:30:00', all_day: false }),
      'calendar.home': entity('calendar.home', 'on', { message: 'Standup', start_time: '2026-10-12 10:05:00', all_day: false }),
      'calendar.holidays': entity('calendar.holidays', 'off', { message: 'Holiday', start_time: '2026-10-12 00:00:00', all_day: true }),
    };
    expect(attributeEvents(['calendar.work', 'calendar.home', 'calendar.holidays'], (id) => states[id]).map((e) => e.title))
      .toEqual(['Design review', 'Standup', 'Holiday']);
    const p = dashboardPreview(ownerDash, layout, (id) => states[id], now, null);
    expect(p.events).toEqual([
      { start: 'now', startColor: DASH_CYAN, title: 'Standup' },
      { start: '1.3h', startColor: DASH_GREY, title: 'Design review' },
    ]);
    // get_events' events win over the entities'; an empty read leaves the band empty.
    const read = dashboardPreview(ownerDash, layout, (id) => states[id], now, null, { events: [{ startSec: nowSec + 2 * 3600, title: 'Dentist' }] });
    expect(read.events.map((e) => [e.start, e.title])).toEqual([['2.0h', 'Dentist']]);
    expect(dashboardPreview(ownerDash, layout, (id) => states[id], now, null, { events: [] }).events).toEqual([]);
  });

  it('writes the date, the clock and titles as the watch does', () => {
    expect(dashboardPreview(ownerDash, layout, () => undefined, now, null).date).toBe('MON 12');
    expect(formatClock(new Date(2026, 9, 12, 14, 5), 'HH:mm')).toBe('14:05');
    expect(formatClock(new Date(2026, 9, 12, 14, 5), 'hh:mm')).toBe('02:05');
    expect(formatClock(new Date(2026, 9, 12, 0, 30), 'hh:mm')).toBe('12:30');
    expect(cutUtf8('Café crème brûlée réunion', 24)).toBe('Café crème brûlée r');
  });
});

/** The design's six data loads (docs/face_dashboard/v8/scenarios.json), drawn by the approved renders. */
interface Scenario {
  id: string;
  time: string;
  date: string;
  weather: { icon: string; temp: number; hi: number; lo: number };
  events: { start: string; title: string }[];
  on: Record<string, number[]>;
  thermostats: [number, number];
  presence: number;
  freezer: string | null;
  stale: boolean;
}
// A copy of docs/face_dashboard/v8/scenarios.json of the main repository (scenarios-copy.test.ts checks it).
const design = JSON.parse(readFileSync(new URL('./data/scenarios.json', import.meta.url), 'utf8')) as {
  glyphs: Record<string, string[]>;
  scenarios: Scenario[];
};

/** Each scenario's strip, as the approved render draws it. */
const EXPECTED: Record<string, { check: boolean; pills: string }> = {
  none: { check: true, pills: '' },
  few: { check: true, pills: 'KM' },
  medium: { check: false, pills: 'SD?PKLMD' },
  many: { check: false, pills: 'FSMD?PKWLM' },
  alarm: { check: false, pills: 'MKHMK' },
  stale: { check: false, pills: 'FKWD' },
};

/** The render's Font Awesome weather glyph as the HA condition the watch draws it for. */
const CONDITION: Record<string, string> = { f185: 'sunny', f6c4: 'partlycloudy', f740: 'pouring', f0c2: 'cloudy' };

/** A scenario's start text as an event time: a countdown from now, or the next such weekday and time after today. */
function startOf(text: string, at: Date): number {
  const sec = Math.floor(at.getTime() / 1000);
  if (text === 'now') return sec;
  const mins = /^(\d+)m$/.exec(text);
  if (mins) return sec + Number(mins[1]) * 60;
  const hours = /^(\d+(?:\.\d)?)h$/.exec(text);
  if (hours) return sec + Math.round(Number(hours[1]) * 60) * 60;
  const later = /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat) (\d+):(\d\d)$/.exec(text);
  if (!later) throw new Error(`no start: ${text}`);
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(later[1]);
  for (let d = 1; ; d++) {
    const t = new Date(at.getFullYear(), at.getMonth(), at.getDate() + d, Number(later[2]), Number(later[3]));
    if (t.getDay() === day) return Math.floor(t.getTime() / 1000);
  }
}

/** The owner's dashboard and the states of a scenario, as HA would hold them. */
function scenarioPreview(sc: Scenario): DashPreview {
  // The owner's layout order, not the packing order: the preview sorts by type.
  const order = ['doors', 'garage', 'motion', 'lights', 'media'];
  const dashboard: WatchLayoutDashboard = { ...ownerDash, statusGroups: order.map((t) => group(t, design.glyphs[t])) };
  const states: Record<string, HassEntity> = {};
  for (const t of order) {
    design.glyphs[t].forEach((_, i) => {
      const id = `binary_sensor.${t}_${i}`;
      states[id] = entity(id, (sc.on[t] ?? []).includes(i) ? 'on' : 'off');
    });
  }
  states['climate.main'] = entity('climate.main', 'heat', { current_temperature: sc.thermostats[0] });
  states['sensor.attic'] = entity('sensor.attic', String(sc.thermostats[1]), { unit_of_measurement: '°F' });
  ['a', 'b', 'c'].forEach((b, i) => {
    states[`device_tracker.${b}`] = entity(`device_tracker.${b}`, i < sc.presence ? 'home' : 'not_home');
  });
  const freezer = sc.freezer === null ? '-2' : sc.freezer === '!--' ? 'unavailable' : sc.freezer.replace(/[!°]/g, '');
  states['sensor.f1'] = entity('sensor.f1', freezer, { unit_of_measurement: '°F' });
  states['sensor.f2'] = entity('sensor.f2', '-4', { unit_of_measurement: '°F' });
  states['weather.home'] = entity('weather.home', CONDITION[sc.weather.icon], { temperature: sc.weather.temp });

  const [hh, mm] = sc.time.split(':').map(Number);
  const at = new Date(2026, 9, Number(sc.date.split(' ')[1]), hh, mm);
  const events = sc.events.map((e) => ({ startSec: startOf(e.start, at), title: e.title }));
  return dashboardPreview(dashboard, layout, (id) => states[id], at, [sc.weather.hi, sc.weather.lo], { stale: sc.stale, events });
}

describe('dashboard preview: the design\'s scenarios', () => {
  it('covers every scenario of the design', () => {
    expect(design.scenarios.map((s) => s.id).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it.each(design.scenarios.map((s) => [s.id, s] as const))('draws "%s" as the approved render does', (id, sc) => {
    const p = scenarioPreview(sc);
    const want = EXPECTED[id];
    // The strip: which pills show, in order, from which slot, in which colour.
    expect(letters(p)).toBe(want.pills);
    expect(p.check).toBe(want.check ? (sc.stale ? STALE_CHECK : DASH_CALM) : null);
    expect(p.pills.map((x) => x.slot)).toEqual(p.pills.map((_, k) => k + (want.check ? 1 : 0)));
    if (sc.stale) expect(new Set(p.pills.map((x) => x.fill))).toEqual(new Set([STALE_PILL]));
    else expect(p.pills.every((x) => Object.values(SLOT_COLOR).includes(x.fill))).toBe(true);
    // The rest of the screen.
    expect([p.date, p.clock]).toEqual([sc.date, sc.time]);
    expect([p.weatherTemp, p.hiLo]).toEqual([sc.weather.temp, `${sc.weather.hi}/${sc.weather.lo}`]);
    expect(p.events.map((e) => e.start)).toEqual(sc.events.map((e) => e.start));
    expect(p.events.map((e) => e.title)).toEqual(sc.events.map((e) => dotTitle(e.title)));
    expect(p.freezer).toBe(sc.freezer);
    expect(p.thermostats).toBe(`${sc.thermostats[0]}° ${sc.thermostats[1]}°`);
    expect(p.thermostatColor).toBe(sc.stale ? DASH_GREY : DASH_WHITE);
    expect(p.home).toBe(sc.presence);
  });

  it('dots the long titles of "many" where the render does', () => {
    const many = scenarioPreview(design.scenarios.find((s) => s.id === 'many')!);
    expect(many.events.map((e) => e.title)).toEqual(['Birthday dinner at...', 'Costco run and pr...']);
  });
});
