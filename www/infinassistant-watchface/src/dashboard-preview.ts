/**
 * How the watch draws the dashboard (firmware 2.4.98, HomeAssistant.cpp "dashboard v8", time-first
 * minimal; docs/face_dashboard/v8/design-spec.md), for the card's preview, from the states the app
 * would send it (DASHBOARD_STATE, DashboardStateBuilder.kt).
 *
 * One quiet line on top (the date, the screen indicator, the weather), the time across the full
 * width, two event lines, then a strip of ten pills: the glyphs that are on, packed left in type
 * order, slot 0 answering "are the doors shut?". A red bar across the screen for a freezer alarm,
 * a rule, then the thermostats and the number at home, and battery, steps and heart rate.
 *
 * Positions are the watch's, in pixels of its 240 x 240 screen. Text is placed by its baseline,
 * as the design's generator (gen/concept-4-minimal.py) draws the approved renders.
 */
import type { HassEntity, WatchLayoutDashboard, WatchLayoutGlyph, WatchLayoutJSON } from './types';
import { ACTIVE_STATES } from './tile-preview';

export const DASH_WHITE = '#E5E5EA';
export const DASH_GREY = '#8E8E93';
export const DASH_FAINT = '#48484A';
export const DASH_RULE = '#2C2C2E';
export const DASH_CYAN = '#5AC8FA';
export const DASH_CALM = '#2F7D4F';
export const DASH_RED = '#FF453A';
/** The pills' letters and the freezer text. */
export const DASH_INK = '#000000';

/** Stale: a grey pill with its black letter (legible, clearly not live) and a faint check. */
export const STALE_PILL = DASH_GREY;
export const STALE_CHECK = DASH_FAINT;

export type DashSlot = 'doors' | 'garage' | 'lights' | 'media' | 'motion';

/** The order the pills pack in: security first, on a warm scale, then activity on a cool one. */
export const TYPE_ORDER: readonly DashSlot[] = ['doors', 'garage', 'lights', 'media', 'motion'];

/** Each type's pill colour. */
export const SLOT_COLOR: Readonly<Record<DashSlot, string>> = {
  doors: '#FF9500',
  garage: '#FF453A',
  lights: '#FFCC00',
  media: '#BF5AF2',
  motion: '#5AC8FA',
};

/** The strip: ten 20 x 16 pills of radius 8, 23 px apart from x 6, at y 155. */
export const PILL = { x0: 6, pitch: 23, w: 20, h: 16, y: 155, radius: 8 } as const;
export const PILL_SLOTS = 10;

/** A pill's left edge. */
export function pillX(slot: number): number {
  return PILL.x0 + PILL.pitch * slot;
}

/** The event titles' column: from x 88, cut with "..." at 146 px (LV_LABEL_LONG_DOT). */
export const TITLE_X = 88;
export const TITLE_W = 146;

/** The text baselines (gen/concept-4-minimal.py). Event line n is at event + 18 n. */
export const DASH_BASE = {
  top: 19,
  hiLo: 36,
  time: 106,
  event: 128,
  pill: 168,
  freezer: 191,
  house: 212,
  watch: 234,
} as const;

/** The icons' boxes (left, top), 20 px; the weather icon's is 25 px and ends at x 180. */
export const DASH_ICON = {
  check: [6, 152],
  home: [180, 196],
  battery: [6, 218],
  steps: [88, 218],
  heart: [180, 218],
  weather: [155, 8],
} as const;

/** The watch's status groups and glyphs per group (LayoutService::kMaxStatusGroups, kMaxGlyphsPerGroup). */
export const MAX_STATUS_GROUPS = 5;
export const MAX_GLYPHS = 10;
/** An event this long after its start still shows, as "now" (kDashEventGraceSec). */
export const EVENT_GRACE_SEC = 600;
/** DashLive::kEvents: the events the watch shows. */
export const MAX_EVENTS = 2;
/** DashLive::kTitleSize less the end: the app cuts a title to it. */
export const MAX_TITLE_BYTES = 24;
/** The events the app reads per calendar (DashboardStateOrchestrator.CALENDAR_FETCH). */
export const EVENTS_PER_CALENDAR = 8;

/** The states a glyph lights for: the tiles' list and a door in motion (DashboardStateBuilder.ACTIVE_STATES). */
export const DASH_ACTIVE_STATES: ReadonlySet<string> = new Set([...ACTIVE_STATES, 'opening', 'closing']);

/** A glyph that is on, and the type it packs and colours as. */
export interface DashGlyph {
  letter: string;
  type: DashSlot;
}

/** A pill in the strip: its letter, its slot (0 to 9) and its fill. */
export interface DashPill {
  letter: string;
  slot: number;
  fill: string;
}

/** A calendar event: its start in epoch seconds (0 for an all-day one) and its title. */
export interface DashEvent {
  startSec: number;
  title: string;
}

/** An event line: the start (a countdown or "Wed 9:00") in its colour, and the title as drawn. */
export interface DashEventLine {
  start: string;
  startColor: string;
  title: string;
}

export interface DashPreview {
  /** The top line: "MON 19", and the weather when known. */
  date: string;
  weatherIcon: string | null;
  weatherTemp: number | null;
  hiLo: string | null;
  /** "HH:MM". */
  clock: string;
  /** At most two; none leaves the band empty. */
  events: DashEventLine[];
  /** The check's colour in slot 0, or null when it is hidden. */
  check: string | null;
  pills: DashPill[];
  /** "!17°" (the warmest alarming freezer), "!--" (a freezer with no reading) or null. */
  freezer: string | null;
  /** "72° 70°", or '' with no reading; in its colour (grey when stale). */
  thermostats: string;
  thermostatColor: string;
  /** The number at home, or null with no beacon reading. */
  home: number | null;
  stale: boolean;
}

/** The glyphs the watch keeps of a group: one ASCII character each, at most ten (LayoutDecoder.cpp). */
export function keptGlyphs(glyphs: readonly WatchLayoutGlyph[]): WatchLayoutGlyph[] {
  return glyphs
    .filter((g) => typeof g.symbol === 'string' && g.symbol.length === 1 && g.symbol.charCodeAt(0) >= 1 && g.symbol.charCodeAt(0) <= 0x7f)
    .slice(0, MAX_GLYPHS);
}

/** The type a group's pills pack and colour as; any other type packs with media (SlotOf). */
export function slotOf(type: string): DashSlot {
  switch (type.toLowerCase()) {
    case 'doors':
      return 'doors';
    case 'garage':
      return 'garage';
    case 'lights':
      return 'lights';
    case 'motion':
      return 'motion';
    default:
      return 'media';
  }
}

/**
 * The glyphs that are on, in type order (doors, garage, lights, media, motion), each type's
 * groups in the layout's order. `isOn` reads a glyph's entity.
 */
export function litGlyphs(
  groups: readonly { type: string; glyphs: readonly WatchLayoutGlyph[] }[],
  isOn: (entityId: string) => boolean,
): DashGlyph[] {
  const kept = groups.slice(0, MAX_STATUS_GROUPS);
  const lit: DashGlyph[] = [];
  for (const type of TYPE_ORDER) {
    for (const group of kept) {
      if (slotOf(group.type) !== type) continue;
      for (const g of keptGlyphs(group.glyphs ?? [])) {
        if (g.symbol !== '#' && g.entity && isOn(g.entity)) lit.push({ letter: g.symbol, type });
      }
    }
  }
  return lit;
}

/**
 * The strip of ten pills (design-spec.md, "Pill slots"). Slot 0 is the doors verdict: the dim
 * green check when no door or garage door is open, and the pills pack from slot 1; else the first
 * door or garage pill. With the check and ten pills both due, the strip is saturated and the check
 * gives way. Stale, the pills are grey and the check faint.
 */
export function statusStrip(lit: readonly DashGlyph[], stale: boolean): { check: string | null; pills: DashPill[] } {
  const shown = lit.slice(0, PILL_SLOTS);
  const doorsShut = !lit.some((g) => g.type === 'doors' || g.type === 'garage');
  const showCheck = doorsShut && shown.length < PILL_SLOTS;
  const first = showCheck ? 1 : 0;
  return {
    check: showCheck ? (stale ? STALE_CHECK : DASH_CALM) : null,
    pills: shown.map((g, k) => ({ letter: g.letter, slot: first + k, fill: stale ? STALE_PILL : SLOT_COLOR[g.type] })),
  };
}

/** A temperature-like reading: a climate's current_temperature, else the state as a number, rounded. */
export function reading(entityId: string, state: HassEntity | undefined): number | null {
  if (!state) return null;
  if (entityId.startsWith('climate.')) {
    const t = Number(state.attributes?.current_temperature);
    if (state.attributes?.current_temperature != null && Number.isFinite(t)) return Math.round(t);
  }
  if (state.state.trim() === '') return null;
  const v = Number(state.state);
  return Number.isFinite(v) ? Math.round(v) : null;
}

/** A beacon: 1 at home, 0 away (another zone included), null when HA does not know. */
export function presence(state: HassEntity | undefined): number | null {
  const s = state?.state?.trim().toLowerCase();
  if (s === undefined || s === '' || s === 'unavailable' || s === 'unknown') return null;
  if (s === 'home' || s === 'on') return 1;
  const v = Number(s);
  if (Number.isFinite(v)) return v > 0 ? 1 : 0;
  return 0;
}

/** Above this a freezer alarms, once it has stayed there 20 min (FreezerAlertTracker). */
export function freezerThreshold(state: HassEntity | undefined): number {
  const unit = String(state?.attributes?.unit_of_measurement ?? '');
  return unit.includes('C') ? -9 : 15;
}

/** HA's weather condition as the MDI icon closest to the watch's glyph for it (WeatherIconOf). */
export function weatherIcon(condition: string): string | null {
  switch (condition) {
    case 'sunny':
    case 'clear':
    case 'clear-night':
      return 'mdi:weather-sunny';
    case 'partlycloudy':
      return 'mdi:weather-partly-cloudy';
    case 'cloudy':
    case 'windy':
    case 'windy-variant':
      return 'mdi:weather-cloudy';
    case 'rainy':
      return 'mdi:weather-partly-rainy';
    case 'pouring':
      return 'mdi:weather-pouring';
    case 'snowy':
    case 'snowy-rainy':
      return 'mdi:snowflake';
    case 'hail':
      return 'mdi:weather-hail';
    case 'lightning':
    case 'lightning-rainy':
      return 'mdi:flash';
    case 'fog':
      return 'mdi:weather-fog';
    case 'exceptional':
      return 'mdi:cancel';
    default:
      return null;
  }
}

/**
 * Today's high and low from a weather.get_forecasts response (the app reads them so), or null.
 * The response is { response: { "<entity>": { forecast: [{ temperature, templow }, ...] } } }.
 */
export function forecastHiLo(result: unknown, entityId: string): [number, number] | null {
  const forecast = (result as { response?: Record<string, { forecast?: unknown[] }> } | null)?.response?.[entityId]?.forecast;
  return firstDayHiLo(forecast);
}

/** The same from the forecast attribute, which HA dropped in 2024.4 (older installs still have it). */
export function legacyHiLo(state: HassEntity | undefined): [number, number] | null {
  return firstDayHiLo(state?.attributes?.forecast);
}

function firstDayHiLo(forecast: unknown): [number, number] | null {
  if (!Array.isArray(forecast) || forecast.length === 0) return null;
  const today = forecast[0] as { temperature?: unknown; templow?: unknown };
  const hi = Number(today?.temperature);
  const lo = Number(today?.templow);
  if (today?.temperature == null || today?.templow == null || !Number.isFinite(hi) || !Number.isFinite(lo)) return null;
  return [Math.round(hi), Math.round(lo)];
}

/** The countdown to an event (FormatMeetingDuration): "now", "12m", "3.5h", "12h". */
export function formatCountdown(startSec: number, nowSec: number): string {
  if (startSec <= nowSec) return 'now';
  const mins = Math.floor((startSec - nowSec) / 60);
  if (mins < 60) return `${mins}m`;
  const tenths = Math.floor((mins * 10) / 60);
  if (tenths < 100) return `${Math.floor(tenths / 10)}.${tenths % 10}h`;
  return `${Math.floor(tenths / 10)}h`;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * An event's start: the countdown ("now", "12m", "1.3h", "12h") when it has begun or begins later
 * today; on another day, its weekday and its 24-hour local time ("Wed 9:00").
 */
export function formatEventStart(startSec: number, nowSec: number): string {
  const start = new Date(startSec * 1000);
  const now = new Date(nowSec * 1000);
  const today = start.getFullYear() === now.getFullYear() && start.getMonth() === now.getMonth() && start.getDate() === now.getDate();
  if (startSec <= nowSec || today) return formatCountdown(startSec, nowSec);
  return `${WEEKDAYS[start.getDay()]} ${start.getHours()}:${String(start.getMinutes()).padStart(2, '0')}`;
}

/** The heart rate as the watch writes it: the beats per minute, or "--" with no reading (0). */
export function formatHeartRate(bpm: number): string {
  return bpm > 0 ? String(bpm) : '--';
}

/** [text] cut to at most [maxBytes] bytes of UTF-8, never splitting a character (WireText.fit). */
export function cutUtf8(text: string, maxBytes: number): string {
  let bytes = 0;
  let out = '';
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    const n = cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
    if (bytes + n > maxBytes) break;
    bytes += n;
    out += ch;
  }
  return out;
}

/**
 * Montserrat 14's advances in pixels for ASCII 0x20 to 0x7E, as the watch's 1-bit font has them
 * (lv_font_montserrat_14.c: adv_w / 16, rounded as LVGL draws them).
 */
const M14_ADVANCE = [
  4, 4, 6, 10, 9, 12, 10, 3, 5, 5, 6, 8, 3, 5, 3, 5, 9, 5, 8, 8, 9, 8, 9, 8, 9, 9, 3, 3, 8, 8, 8, 8,
  15, 10, 11, 10, 12, 9, 9, 11, 11, 4, 7, 10, 8, 13, 11, 12, 10, 12, 10, 9, 8, 11, 10, 16, 9, 9, 9, 5, 5, 5, 8, 7,
  8, 8, 10, 8, 10, 9, 5, 10, 10, 4, 4, 9, 4, 15, 10, 9, 10, 10, 6, 7, 6, 10, 8, 13, 8, 8, 7, 5, 4, 5, 8,
];

/** The width of [text] in the watch's Montserrat 14; a character the font lacks takes none, as LVGL draws it. */
export function m14Width(text: string): number {
  let w = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp >= 0x20 && cp <= 0x7e) w += M14_ADVANCE[cp - 0x20];
    else if (cp === 0xb0) w += 6;
  }
  return w;
}

/**
 * A title as its fixed-width label shows it: whole when it fits, else the longest start that fits
 * with "..." after it, trailing spaces dropped (LV_LABEL_LONG_DOT; gen/concept-4-minimal.py).
 */
export function dotTitle(title: string, width: number = TITLE_W): string {
  if (m14Width(title) <= width) return title;
  const chars = [...title];
  for (let n = chars.length; n > 0; n--) {
    const cut = `${chars.slice(0, n).join('').trimEnd()}...`;
    if (m14Width(cut) <= width) return cut;
  }
  return '...';
}

/** The clock: "HH:MM", or the 12-hour form without AM/PM when the layout asks for "hh:mm" (Is24Hour). */
export function formatClock(now: Date, timeFormat: string | undefined): string {
  let hour = now.getHours();
  if (timeFormat !== undefined && timeFormat.startsWith('h')) {
    hour %= 12;
    if (hour === 0) hour = 12;
  }
  return `${String(hour).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/**
 * The battery icon for a level, as the design draws it: full from 90 %, three quarters from 60,
 * half from 35, a quarter from 10, else empty. MDI's batteries stand up: the card turns them.
 */
export function batteryIcon(percent: number): string {
  if (percent >= 90) return 'mdi:battery';
  if (percent >= 60) return 'mdi:battery-70';
  if (percent >= 35) return 'mdi:battery-50';
  if (percent >= 10) return 'mdi:battery-20';
  return 'mdi:battery-outline';
}

/**
 * The calendars the dashboard's events come from, as the app's parser takes them (WatchFaceParser):
 * its own, else every calendar of the layout while its events are on. maxEvents is how many events
 * show, not how many calendars they are read from.
 */
export function dashboardCalendars(dashboard: WatchLayoutDashboard, layout: Pick<WatchLayoutJSON, 'events'>): string[] {
  const named = (ids: readonly string[]) => [...new Set(ids.filter((c) => !!c && c.trim() !== ''))];
  const own = named((dashboard.events ?? []).map((e) => e.calendar));
  if (own.length > 0) return own;
  const events = layout.events;
  if (!events?.enabled) return [];
  return named(events.calendars ?? []);
}

/**
 * An event's start in epoch seconds: HA's ISO time ("2026-10-12T11:30:00-06:00") or a calendar
 * entity's local "2026-10-12 11:30:00". 0 for an all-day event (a date alone) or text that does
 * not parse.
 */
export function eventStartSec(start: unknown): number {
  if (typeof start !== 'string') return 0;
  const iso = start.trim().replace(' ', 'T');
  if (!iso.includes('T')) return 0;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : 0;
}

/**
 * The calendars' events from a calendar.get_events response, as the app reads them: the first
 * eight of each calendar, all-day ones included (start 0). Null when the response has none of
 * them. The response is { response: { "<calendar>": { events: [{ start, summary }, ...] } } }.
 */
export function calendarEvents(result: unknown, calendars: readonly string[]): DashEvent[] | null {
  const response = (result as { response?: Record<string, { events?: unknown }> } | null)?.response;
  if (!response) return null;
  let read = false;
  const events: DashEvent[] = [];
  for (const id of calendars) {
    const list = response[id]?.events;
    if (!Array.isArray(list)) continue;
    read = true;
    for (const e of list.slice(0, EVENTS_PER_CALENDAR)) {
      const { start, summary } = (e ?? {}) as { start?: unknown; summary?: unknown };
      events.push({ startSec: eventStartSec(start), title: String(summary ?? '') });
    }
  }
  return read ? events : null;
}

/**
 * Each calendar's current or next event from its entity, which HA keeps in its attributes
 * (start_time as local "YYYY-MM-DD HH:MM:SS"): the preview's events when get_events is not read.
 */
export function attributeEvents(calendars: readonly string[], state: (entityId: string) => HassEntity | undefined): DashEvent[] {
  const events: DashEvent[] = [];
  for (const id of calendars) {
    const attrs = state(id)?.attributes;
    if (!attrs || typeof attrs.start_time !== 'string') continue;
    events.push({ startSec: attrs.all_day === true ? 0 : eventStartSec(attrs.start_time), title: String(attrs.message ?? '') });
  }
  return events;
}

/**
 * The events the watch shows, as the app picks them (DashboardStateBuilder): timed ones that have
 * not been under way 10 min, each once, the earliest two, every title cut to 24 bytes.
 */
export function upcomingEvents(events: readonly DashEvent[], nowSec: number): DashEvent[] {
  const seen = new Set<string>();
  return events
    .filter((e) => e.startSec > 0 && e.startSec + EVENT_GRACE_SEC > nowSec)
    .filter((e) => {
      const key = `${e.startSec}\u0000${e.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.startSec - b.startSec)
    .slice(0, MAX_EVENTS)
    .map((e) => ({ startSec: e.startSec, title: cutUtf8(e.title, MAX_TITLE_BYTES) }));
}

/** The event lines: event 1's start cyan, event 2's grey, each title dotted at the column's width. */
export function eventLines(events: readonly DashEvent[], nowSec: number): DashEventLine[] {
  return events.slice(0, MAX_EVENTS).map((e, i) => ({
    start: formatEventStart(e.startSec, nowSec),
    startColor: i === 0 ? DASH_CYAN : DASH_GREY,
    title: dotTitle(e.title || 'event'),
  }));
}

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export interface DashOptions {
  /** The watch's live state is over 30 min old (kDashStaleSec): the house status greys. */
  stale?: boolean;
  /** The calendars' events from calendar.get_events (calendarEvents); without them, each calendar entity's own. */
  events?: readonly DashEvent[] | null;
}

/** The whole dashboard as the watch would draw it now, from Home Assistant's states. */
export function dashboardPreview(
  dashboard: WatchLayoutDashboard,
  layout: Pick<WatchLayoutJSON, 'events' | 'header'>,
  state: (entityId: string) => HassEntity | undefined,
  now: Date,
  hiLo: readonly [number, number] | null,
  options: DashOptions = {},
): DashPreview {
  const stale = options.stale === true;
  const isOn = (entityId: string): boolean => DASH_ACTIVE_STATES.has(state(entityId)?.state ?? '');
  const { check, pills } = statusStrip(litGlyphs(dashboard.statusGroups ?? [], isOn), stale);

  const temps: number[] = [];
  let home = 0;
  let haveBeacons = false;
  let freezerAlarm: number | null = null;
  let deadFreezer = false;
  for (const group of (dashboard.sensorGroups ?? []).slice(0, 3)) {
    for (const sensor of (group.sensors ?? []).slice(0, 7)) {
      const s = state(sensor.entity);
      switch (group.type.toLowerCase()) {
        case 'thermostats': {
          const v = reading(sensor.entity, s);
          if (v !== null) temps.push(v);
          break;
        }
        case 'beacons': {
          const p = presence(s);
          if (p !== null) {
            haveBeacons = true;
            home += p;
          }
          break;
        }
        case 'freezers': {
          const v = reading(sensor.entity, s);
          if (v === null) deadFreezer = true;
          else if (v > freezerThreshold(s) && (freezerAlarm === null || v > freezerAlarm)) freezerAlarm = v;
          break;
        }
        default:
          break;
      }
    }
  }

  const weatherState = dashboard.weather?.entity ? state(dashboard.weather.entity) : undefined;
  const icon = weatherState ? weatherIcon(weatherState.state) : null;
  const tempRaw = Number(weatherState?.attributes?.temperature);
  const weatherTemp = icon !== null && weatherState?.attributes?.temperature != null && Number.isFinite(tempRaw)
    ? Math.round(tempRaw) : null;

  const nowSec = Math.floor(now.getTime() / 1000);
  const calendars = dashboardCalendars(dashboard, layout);
  const candidates = options.events ?? attributeEvents(calendars, state);

  return {
    date: `${DAYS[now.getDay()]} ${now.getDate()}`,
    weatherIcon: weatherTemp !== null ? icon : null,
    weatherTemp,
    hiLo: weatherTemp !== null && hiLo ? `${hiLo[0]}/${hiLo[1]}` : null,
    clock: formatClock(now, layout.header?.time?.format),
    events: eventLines(upcomingEvents(candidates, nowSec), nowSec),
    check,
    pills,
    freezer: freezerAlarm !== null ? `!${freezerAlarm}°` : deadFreezer ? '!--' : null,
    thermostats: temps.slice(0, 2).map((t) => `${t}°`).join(' '),
    thermostatColor: stale ? DASH_GREY : DASH_WHITE,
    home: haveBeacons ? home : null,
    stale,
  };
}
