import { describe, expect, it } from 'vitest';
import {
  TILE_ACCENT_DEFAULT,
  TILE_H,
  TILE_W,
  formatTileState,
  hexColor,
  isActiveState,
  litGround,
  nameWraps,
  tilePosition,
} from '../src/tile-preview';

// The preview draws a tile screen as firmware 2.4.94 does (HomeAssistant.cpp "Tile screens").
describe('tile preview', () => {
  it('places the 2x2 grid where the watch does, above the n/N indicator', () => {
    expect([0, 1, 2, 3].map(tilePosition)).toEqual([
      { left: 4, top: 4 },
      { left: 122, top: 4 },
      { left: 4, top: 112 },
      { left: 122, top: 112 },
    ]);
    expect(tilePosition(3).left + TILE_W).toBe(236);
    expect(tilePosition(3).top + TILE_H).toBe(216);
  });

  it('counts the same states as on as the watch and the app', () => {
    for (const s of ['on', 'open', 'home', 'playing', 'heat', 'cool', 'heat_cool', 'auto', 'unlocked', 'above_horizon', 'fan_only', 'dry']) {
      expect(isActiveState(s)).toBe(true);
    }
    for (const s of ['off', 'closed', 'not_home', 'idle', 'paused', 'unavailable', '---', '72.4', '', null, undefined]) {
      expect(isActiveState(s)).toBe(false);
    }
  });

  it('writes the state line as the watch does: spaces for underscores, cut with a dot', () => {
    expect(formatTileState('on')).toBe('on');
    expect(formatTileState('not_home')).toBe('not home');
    expect(formatTileState('unavailable')).toBe('unavail.');
    expect(formatTileState('heat_cool')).toBe('heat co.');
    expect(formatTileState('above_horizon')).toBe('above h.');
    expect(formatTileState('12345678')).toBe('12345678');
  });

  it('tints a lit tile with 56/255 of the accent, as lv_color_mix(accent, black, 56)', () => {
    expect(litGround('#FFD700')).toBe('#382F00');
    expect(litGround('#18A1FF')).toBe('#052338');
    expect(litGround('#000000')).toBe('#000000');
  });

  it('falls back to gold for an active colour that is unset or not #RRGGBB', () => {
    expect(hexColor('#18a1ff', TILE_ACCENT_DEFAULT)).toBe('#18A1FF');
    expect(hexColor('', TILE_ACCENT_DEFAULT)).toBe('#FFD700');
    expect(hexColor('gold', TILE_ACCENT_DEFAULT)).toBe('#FFD700');
    expect(hexColor(undefined, TILE_ACCENT_DEFAULT)).toBe('#FFD700');
  });

  it('wraps a name longer than the 8 characters a tile line holds', () => {
    expect(nameWraps('GAR LGHT')).toBe(false);
    expect(nameWraps('LIVING ROOM')).toBe(true);
  });
});
