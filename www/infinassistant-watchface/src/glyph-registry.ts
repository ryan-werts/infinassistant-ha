/**
 * Glyph Registry - Icon definitions for InfinAssistant Watch Face
 *
 * Provides SVG paths and metadata for the restricted glyph set used on the watch.
 * These glyphs are optimized for the 240x240 display.
 */

import type { GlyphId, PresenceIconType } from './types';

export interface GlyphInfo {
  id: GlyphId;
  name: string;
  category: 'presence' | 'entity' | 'status';
  path: string;
  viewBox: string;
}

// SVG paths for each glyph (Material Design Icons style, simplified for watch)
const GLYPH_PATHS: Record<GlyphId, string> = {
  // Presence icons
  truck: 'M18 18.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5m1.5-9H17V12h4.46L19.5 9.5M6 18.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5M20 8l3 4v5h-2c0 1.66-1.34 3-3 3s-3-1.34-3-3H9c0 1.66-1.34 3-3 3s-3-1.34-3-3H1V6c0-1.11.89-2 2-2h14v4h3M3 6v9h.76c.55-.61 1.35-1 2.24-1s1.69.39 2.24 1H15V6H3z',
  car: 'M5 11l1.5-4.5h11L19 11m-1.5 5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5m-11 0c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5M18.92 6c-.2-.58-.76-1-1.42-1h-11c-.66 0-1.22.42-1.42 1L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-6z',
  person_male: 'M12 4a4 4 0 014 4 4 4 0 01-4 4 4 4 0 01-4-4 4 4 0 014-4m0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4z',
  person_female: 'M12 4a4 4 0 014 4 4 4 0 01-4 4 4 4 0 01-4-4 4 4 0 014-4m0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4z',

  // Entity icons
  door: 'M8 3h8a2 2 0 012 2v16h-2V5h-6v14H8V5a2 2 0 00-2 2v12H4V7a4 4 0 014-4m8 8a1 1 0 110 2 1 1 0 010-2z',
  garage: 'M19 20H5V11l7-7 7 7v9m-2-2v-5.17l-5-5-5 5V18h10m-5-4h2v4h-2v-4z',
  music: 'M21 3v12.5a3.5 3.5 0 01-3.5 3.5 3.5 3.5 0 01-3.5-3.5 3.5 3.5 0 013.5-3.5c.54 0 1.05.12 1.5.34V6.47L9 8.6v8.9A3.5 3.5 0 015.5 21 3.5 3.5 0 012 17.5 3.5 3.5 0 015.5 14c.54 0 1.05.12 1.5.34V6l14-3z',
  light: 'M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 01-1 1H9a1 1 0 01-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7m2.85 11.1l.15.2V16h-6v-2.7l.15-.2A5.01 5.01 0 0012 4a5 5 0 00-2.85 9.1M9 18h6v1a1 1 0 01-1 1h-4a1 1 0 01-1-1v-1z',
  tv: 'M21 17H3V5h18m0-2H3a2 2 0 00-2 2v12a2 2 0 002 2h5v2h8v-2h5a2 2 0 002-2V5a2 2 0 00-2-2z',
  home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z',
  fan: 'M12 11a1 1 0 110 2 1 1 0 010-2zm0-9c1.66 0 3 1.34 3 3v1.28c1.53.83 3 2.54 3 4.72h-3a3 3 0 00-3-3 3 3 0 00-3 3H6c0-2.18 1.47-3.89 3-4.72V5c0-1.66 1.34-3 3-3zm0 20c-1.66 0-3-1.34-3-3v-1.28C7.47 16.89 6 15.18 6 13h3a3 3 0 003 3 3 3 0 003-3h3c0 2.18-1.47 3.89-3 4.72V19c0 1.66-1.34 3-3 3z',
  fire: 'M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z',

  // Status bar icons
  battery: 'M16 20H8V6h8m0-2V2H8v2H6v18h12V4h-2m-2 8H10v6h4v-6z',
  bluetooth: 'M14.88 16.29L13 18.17v-6.35l1.88 1.88a.996.996 0 101.41-1.41L13.41 9.4l2.88-2.89a.996.996 0 10-1.41-1.41L11 8.98V2.63l1.88 1.88a.996.996 0 101.41-1.41L11.41.22c-.78-.78-2.05-.78-2.83 0L5.7 3.1a.996.996 0 101.41 1.41L9 2.63v6.35L6.12 6.1a.996.996 0 10-1.41 1.41l2.88 2.89-2.88 2.89a.996.996 0 101.41 1.41L9 11.82v6.35l-1.88-1.88a.996.996 0 10-1.41 1.41l2.88 2.88c.78.78 2.05.78 2.83 0l2.88-2.88a.996.996 0 10-1.41-1.41z',
  heart: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
  steps: 'M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2M9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7',
  bell: 'M21 19v1H3v-1l2-2v-6c0-3.1 2.03-5.83 5-6.71V4a2 2 0 012-2 2 2 0 012 2v.29c2.97.88 5 3.61 5 6.71v6l2 2m-7 2a2 2 0 01-2 2 2 2 0 01-2-2',
};

// Glyph metadata
const GLYPH_INFO: Record<GlyphId, Omit<GlyphInfo, 'id' | 'path'>> = {
  truck: { name: 'Truck', category: 'presence', viewBox: '0 0 24 24' },
  car: { name: 'Car', category: 'presence', viewBox: '0 0 24 24' },
  person_male: { name: 'Person (Male)', category: 'presence', viewBox: '0 0 24 24' },
  person_female: { name: 'Person (Female)', category: 'presence', viewBox: '0 0 24 24' },
  door: { name: 'Door', category: 'entity', viewBox: '0 0 24 24' },
  garage: { name: 'Garage', category: 'entity', viewBox: '0 0 24 24' },
  music: { name: 'Music', category: 'entity', viewBox: '0 0 24 24' },
  light: { name: 'Light', category: 'entity', viewBox: '0 0 24 24' },
  tv: { name: 'TV', category: 'entity', viewBox: '0 0 24 24' },
  home: { name: 'Home', category: 'entity', viewBox: '0 0 24 24' },
  fan: { name: 'Fan', category: 'entity', viewBox: '0 0 24 24' },
  fire: { name: 'Fire', category: 'entity', viewBox: '0 0 24 24' },
  battery: { name: 'Battery', category: 'status', viewBox: '0 0 24 24' },
  bluetooth: { name: 'Bluetooth', category: 'status', viewBox: '0 0 24 24' },
  heart: { name: 'Heart Rate', category: 'status', viewBox: '0 0 24 24' },
  steps: { name: 'Steps', category: 'status', viewBox: '0 0 24 24' },
  bell: { name: 'Notifications', category: 'status', viewBox: '0 0 24 24' },
};

// All valid glyph IDs
export const GLYPH_IDS: GlyphId[] = Object.keys(GLYPH_PATHS) as GlyphId[];

// Presence-only glyph IDs
export const PRESENCE_GLYPH_IDS: PresenceIconType[] = [
  'truck',
  'car',
  'person_male',
  'person_female',
];

// Entity glyph IDs (for tiles and actions)
export const ENTITY_GLYPH_IDS: GlyphId[] = [
  'door',
  'garage',
  'music',
  'light',
  'tv',
  'home',
  'fan',
  'fire',
];

// Status bar glyph IDs
export const STATUS_GLYPH_IDS: GlyphId[] = [
  'battery',
  'bluetooth',
  'heart',
  'steps',
  'bell',
];

/**
 * Check if a glyph ID is valid
 */
export function isValidGlyph(id: string): id is GlyphId {
  return id in GLYPH_PATHS;
}

/**
 * Check if a glyph ID is valid for presence icons
 */
export function isValidPresenceGlyph(id: string): id is PresenceIconType {
  return PRESENCE_GLYPH_IDS.includes(id as PresenceIconType);
}

/**
 * Get the SVG path for a glyph
 */
export function getGlyphPath(id: GlyphId): string {
  return GLYPH_PATHS[id] || GLYPH_PATHS.home;
}

/**
 * Get the display name for a glyph
 */
export function getGlyphName(id: GlyphId): string {
  return GLYPH_INFO[id]?.name || id;
}

/**
 * Get full glyph info
 */
export function getGlyphInfo(id: GlyphId): GlyphInfo {
  const info = GLYPH_INFO[id];
  return {
    id,
    path: GLYPH_PATHS[id],
    ...info,
  };
}

/**
 * Get all glyphs for a category
 */
export function getGlyphsByCategory(category: GlyphInfo['category']): GlyphInfo[] {
  return GLYPH_IDS
    .filter((id) => GLYPH_INFO[id].category === category)
    .map((id) => getGlyphInfo(id));
}

/**
 * Get dropdown options for glyphs
 */
export function getGlyphOptions(
  category?: GlyphInfo['category']
): Array<{ value: GlyphId; label: string }> {
  const ids = category
    ? GLYPH_IDS.filter((id) => GLYPH_INFO[id].category === category)
    : GLYPH_IDS;

  return ids.map((id) => ({
    value: id,
    label: getGlyphName(id),
  }));
}

/**
 * Get dropdown options for presence icons only
 */
export function getPresenceGlyphOptions(): Array<{ value: PresenceIconType; label: string }> {
  return PRESENCE_GLYPH_IDS.map((id) => ({
    value: id,
    label: getGlyphName(id),
  }));
}

/**
 * Get dropdown options for entity icons (tiles/actions)
 */
export function getEntityGlyphOptions(): Array<{ value: GlyphId; label: string }> {
  return ENTITY_GLYPH_IDS.map((id) => ({
    value: id,
    label: getGlyphName(id),
  }));
}

