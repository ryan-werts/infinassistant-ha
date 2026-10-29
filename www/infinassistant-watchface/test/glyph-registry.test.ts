import { describe, expect, it } from 'vitest';
import {
  ENTITY_GLYPH_IDS,
  GLYPH_IDS,
  PRESENCE_GLYPH_IDS,
  STATUS_GLYPH_IDS,
  getEntityGlyphOptions,
  getGlyphInfo,
  getGlyphName,
  getGlyphOptions,
  getGlyphPath,
  getGlyphsByCategory,
  getPresenceGlyphOptions,
  isValidGlyph,
  isValidPresenceGlyph,
} from '../src/glyph-registry';
import type { GlyphId } from '../src/types';

describe('glyph id lists', () => {
  it('registers the 17 glyphs of the GlyphId union', () => {
    expect([...GLYPH_IDS].sort()).toEqual(
      [
        'battery', 'bell', 'bluetooth', 'car', 'door', 'fan', 'fire', 'garage', 'heart',
        'home', 'light', 'music', 'person_female', 'person_male', 'steps', 'truck', 'tv',
      ].sort()
    );
  });

  it('splits every glyph into exactly one category list', () => {
    const categorised = [...PRESENCE_GLYPH_IDS, ...ENTITY_GLYPH_IDS, ...STATUS_GLYPH_IDS];
    expect(new Set(categorised).size).toBe(categorised.length);
    expect([...categorised].sort()).toEqual([...GLYPH_IDS].sort());
  });

  it('keeps the category lists in step with each glyph\'s category metadata', () => {
    expect(getGlyphsByCategory('presence').map((g) => g.id)).toEqual(PRESENCE_GLYPH_IDS);
    expect(getGlyphsByCategory('entity').map((g) => g.id)).toEqual(ENTITY_GLYPH_IDS);
    expect(getGlyphsByCategory('status').map((g) => g.id)).toEqual(STATUS_GLYPH_IDS);
  });
});

describe('isValidGlyph', () => {
  it('accepts every registered id', () => {
    for (const id of GLYPH_IDS) expect(isValidGlyph(id)).toBe(true);
  });

  it('rejects unknown ids, the empty string and wrong case', () => {
    expect(isValidGlyph('rocket')).toBe(false);
    expect(isValidGlyph('')).toBe(false);
    expect(isValidGlyph('Home')).toBe(false);
  });

  // Known defect: the check is `id in GLYPH_PATHS`, which also matches names
  // inherited from Object.prototype. Remove `.fails` once the check uses an
  // own-property lookup.
  it.fails('rejects names inherited from Object.prototype', () => {
    expect(isValidGlyph('toString')).toBe(false);
    expect(isValidGlyph('constructor')).toBe(false);
  });
});

describe('isValidPresenceGlyph', () => {
  it('accepts only the four presence glyphs', () => {
    for (const id of GLYPH_IDS) {
      expect(isValidPresenceGlyph(id)).toBe((PRESENCE_GLYPH_IDS as string[]).includes(id));
    }
    expect(isValidPresenceGlyph('rocket')).toBe(false);
  });
});

describe('glyph lookups', () => {
  it('returns a non-empty SVG path for every glyph', () => {
    for (const id of GLYPH_IDS) {
      expect(getGlyphPath(id)).toMatch(/^M/);
    }
  });

  it('falls back to the home path for an unknown id', () => {
    expect(getGlyphPath('rocket' as GlyphId)).toBe(getGlyphPath('home'));
  });

  it('returns display names, falling back to the id itself', () => {
    expect(getGlyphName('heart')).toBe('Heart Rate');
    expect(getGlyphName('bell')).toBe('Notifications');
    expect(getGlyphName('rocket' as GlyphId)).toBe('rocket');
  });

  it('assembles full glyph info', () => {
    expect(getGlyphInfo('garage')).toEqual({
      id: 'garage',
      name: 'Garage',
      category: 'entity',
      path: getGlyphPath('garage'),
      viewBox: '0 0 24 24',
    });
  });
});

describe('dropdown options', () => {
  it('lists every glyph when no category is given', () => {
    const options = getGlyphOptions();
    expect(options.map((o) => o.value)).toEqual(GLYPH_IDS);
    expect(options.find((o) => o.value === 'tv')?.label).toBe('TV');
  });

  it('filters by category', () => {
    expect(getGlyphOptions('status').map((o) => o.value)).toEqual(STATUS_GLYPH_IDS);
  });

  it('offers the presence and entity pickers their own lists', () => {
    expect(getPresenceGlyphOptions()).toEqual([
      { value: 'truck', label: 'Truck' },
      { value: 'car', label: 'Car' },
      { value: 'person_male', label: 'Person (Male)' },
      { value: 'person_female', label: 'Person (Female)' },
    ]);
    expect(getEntityGlyphOptions().map((o) => o.value)).toEqual(ENTITY_GLYPH_IDS);
    expect(getEntityGlyphOptions().every((o) => o.label === getGlyphName(o.value))).toBe(true);
  });
});
