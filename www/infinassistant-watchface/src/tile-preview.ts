/**
 * How the watch draws a tile screen (firmware 2.4.94, HomeAssistant.cpp "Tile screens"), for the
 * card's preview: a 2x2 grid of dark framed tiles on the 240x240 screen, the name (or icon) over
 * the state, and a tile that is on taking the active colour for its frame and state, on a tint of
 * it. No clock, no status row and no actions: the watch shows none of them on a tile screen.
 */

export const TILE_MARGIN = 4;
export const TILE_GAP = 4;
export const TILE_W = 114;
export const TILE_H = 104;
/** Characters of the 20 px monospace font that fit one line of a tile (106 px). */
export const TILE_LINE_CHARS = 8;

export const TILE_GROUND = '#1A1A2E';
export const TILE_FRAME = '#333355';
export const TILE_STATE_OFF = '#8A8A8A';
export const TILE_ACCENT_DEFAULT = '#FFD700';

/** States the watch counts as on (HomeAssistant::IsEntityActive, WatchFaceOrchestrator.isEntityActive). */
export const ACTIVE_STATES: ReadonlySet<string> = new Set([
  'on', 'open', 'home', 'playing', 'heat', 'cool', 'heat_cool', 'auto',
  'unlocked', 'above_horizon', 'fan_only', 'dry',
]);

/**
 * The icons the watch can draw (TileSymbol: a glyph of its tile font), as the closest MDI icon to
 * that glyph. Any other icon shows the tile's name on the watch, so it does here.
 */
export const TILE_ICON_MDI: Readonly<Record<string, string>> = {
  home: 'mdi:home',
  music: 'mdi:music',
  bell: 'mdi:bell',
  heart: 'mdi:heart-pulse',
  bluetooth: 'mdi:bluetooth',
  door: 'mdi:shield-half-full',
  battery: 'mdi:battery-50',
  steps: 'mdi:shoe-print',
  tv: 'mdi:play',
  fan: 'mdi:white-balance-sunny',
  power: 'mdi:power-plug',
  car: 'mdi:map-marker-radius',
  truck: 'mdi:map-marker-radius',
  person_male: 'mdi:eye',
  person_female: 'mdi:eye',
};

export function isActiveState(state: string | null | undefined): boolean {
  return state != null && ACTIVE_STATES.has(state);
}

/** The state line as the watch writes it: '_' as a space, cut to one line with a '.'. */
export function formatTileState(state: string): string {
  const text = state.replace(/_/g, ' ');
  if (text.length <= TILE_LINE_CHARS) return text;
  return `${text.slice(0, TILE_LINE_CHARS - 1).trimEnd()}.`;
}

/** A tile's top-left corner on the 240x240 screen. */
export function tilePosition(index: number): { left: number; top: number } {
  return {
    left: TILE_MARGIN + (index % 2) * (TILE_W + TILE_GAP),
    top: TILE_MARGIN + Math.floor(index / 2) * (TILE_H + TILE_GAP),
  };
}

/** "#RRGGBB", or the fallback for anything else (an unset colour is empty). */
export function hexColor(text: string | undefined, fallback: string): string {
  return text !== undefined && /^#[0-9a-fA-F]{6}$/.test(text) ? text.toUpperCase() : fallback;
}

/** The ground of a lit tile: 56/255 of the accent over black (lv_color_mix(accent, black, 56)). */
export function litGround(accent: string): string {
  const channel = (offset: number): string =>
    Math.round((parseInt(accent.slice(offset, offset + 2), 16) * 56) / 255).toString(16).padStart(2, '0');
  return `#${channel(1)}${channel(3)}${channel(5)}`.toUpperCase();
}

/** A name wider than one line wraps on the watch, and its lines sit close (2 px apart, not 26). */
export function nameWraps(name: string): boolean {
  return name.length > TILE_LINE_CHARS;
}
