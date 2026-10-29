import { describe, expect, it } from 'vitest';
import {
  COLORS,
  DASHBOARD_GLYPH_DOMAINS,
  DASHBOARD_MAX_GLYPHS_PER_GROUP,
  DASHBOARD_MAX_SENSORS_PER_GROUP,
  DASHBOARD_MAX_SENSOR_GROUPS,
  DASHBOARD_MAX_STATUS_GROUPS,
  DASHBOARD_SENSOR_DOMAINS,
  DASHBOARD_SENSOR_GROUP_TYPES,
  DASHBOARD_STATUS_GROUP_TYPES,
  DEFAULT_CONFIG,
  TILE_TYPE_DOMAINS,
} from '../src/constants';
import {
  GLYPH_DOMAINS,
  MAX_GLYPHS_PER_GROUP,
  MAX_SENSORS_PER_GROUP,
  MAX_SENSOR_GROUPS,
  MAX_STATUS_GROUPS,
  SENSOR_DOMAINS,
  SENSOR_GROUP_TYPES,
  STATUS_GROUP_TYPES,
  WIRE_LONG_ONLY_KEYS,
  WIRE_SHORT_KEYS,
} from '../src/generated/limits';
import { isValidTapAction } from '../src/types';

// src/generated/limits.ts is generated from scripts/config/firmware-limits.yaml,
// the single source of truth for the firmware limits. constants.ts restates the
// dashboard limits by hand, so these tests catch the two drifting apart.
describe('dashboard limits match the generated firmware limits', () => {
  it('uses the same group and per-group maximums', () => {
    expect(DASHBOARD_MAX_STATUS_GROUPS).toBe(MAX_STATUS_GROUPS);
    expect(DASHBOARD_MAX_GLYPHS_PER_GROUP).toBe(MAX_GLYPHS_PER_GROUP);
    expect(DASHBOARD_MAX_SENSOR_GROUPS).toBe(MAX_SENSOR_GROUPS);
    expect(DASHBOARD_MAX_SENSORS_PER_GROUP).toBe(MAX_SENSORS_PER_GROUP);
  });

  it('uses the same group types and entity domains', () => {
    expect(DASHBOARD_STATUS_GROUP_TYPES).toEqual(STATUS_GROUP_TYPES);
    expect(DASHBOARD_SENSOR_GROUP_TYPES).toEqual(SENSOR_GROUP_TYPES);
    expect(DASHBOARD_GLYPH_DOMAINS).toEqual(GLYPH_DOMAINS);
    expect(DASHBOARD_SENSOR_DOMAINS).toEqual(SENSOR_DOMAINS);
  });
});

describe('WATCHFACE_LAYOUT short-key registry', () => {
  const levels = Object.entries(WIRE_SHORT_KEYS) as Array<[string, Record<string, string>]>;

  it('gives every level unique short keys', () => {
    for (const [level, keys] of levels) {
      const shorts = Object.values(keys);
      expect(new Set(shorts).size, level).toBe(shorts.length);
    }
  });

  it('never lets a short key equal a long key of the same level', () => {
    const longOnly = WIRE_LONG_ONLY_KEYS as Record<string, readonly string[]>;
    for (const [level, keys] of levels) {
      const longs = new Set([...Object.keys(keys), ...(longOnly[level] ?? [])]);
      for (const short of Object.values(keys)) {
        expect(longs.has(short), `${level}.${short}`).toBe(false);
      }
    }
  });
});

describe('card constants', () => {
  it('defines a colour for every state colour the validator accepts', () => {
    expect(Object.keys(COLORS).sort()).toEqual(['accent', 'gray', 'green', 'red', 'white', 'yellow']);
    for (const hex of Object.values(COLORS)) expect(hex).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('lists entity domains for every tile type', () => {
    expect(Object.keys(TILE_TYPE_DOMAINS).sort()).toEqual(
      ['count', 'cover_state', 'duration', 'media_count', 'sensor_value', 'state_text']
    );
  });

  it('ships a default configuration for this card type', () => {
    expect(DEFAULT_CONFIG.type).toBe('custom:infinassistant-watchface');
    expect(DEFAULT_CONFIG.screens).toEqual([]);
  });
});

describe('isValidTapAction', () => {
  it('accepts the four tap actions and nothing else', () => {
    for (const tap of ['none', 'toggle', 'more-info', 'service']) expect(isValidTapAction(tap)).toBe(true);
    for (const other of ['', 'hold', 'NONE', null, undefined, 1, {}]) expect(isValidTapAction(other)).toBe(false);
  });
});
