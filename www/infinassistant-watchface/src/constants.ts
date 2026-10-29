/**
 * Constants for InfinAssistant Watch Face Card
 */

import type {
  CardConfig,
  EditorTab,
  StateColor,
  ThemePreset,
} from './types';

// Watch display dimensions
export const WATCH_WIDTH = 240;
export const WATCH_HEIGHT = 240;

// Layout constants
export const HEADER_HEIGHT = 48;
export const EVENTS_HEIGHT = 32;
export const TILES_ROWS = 2;
export const TILES_COLS = 4;
export const TILE_WIDTH = 58;
export const TILE_HEIGHT = 58;
export const TILE_GAP = 2;
// DEPRECATED: action buttons removed in v2 — tiles are the interactive elements
export const ACTIONS_HEIGHT = 40;
export const ACTION_WIDTH = 76;
export const ACTION_GAP = 4;
export const STATUS_BAR_HEIGHT = 24;

// Text sizes (pixels)
export const TIME_FONT_SIZE = 48;
export const PRESENCE_ICON_SIZE = 16;
export const EVENT_FONT_SIZE = 12;
export const TILE_VALUE_FONT_SIZE = 24;
export const TILE_LABEL_FONT_SIZE = 10;
export const ACTION_FONT_SIZE = 12; // DEPRECATED
export const STATUS_BAR_FONT_SIZE = 10;

// Hard limits
export const MAX_TILES = 8; // Legacy global max; use MAX_TILES_PER_SCREEN for per-screen validation
export const MAX_TILES_PER_SCREEN = 4; // Firmware kMaxTilesPerScreen (2x2 grid)
export const MAX_ACTIONS = 3; // DEPRECATED: action buttons removed in v2
export const MAX_EVENTS = 3;
export const MAX_PRESENCE_ICONS = 8;
export const MAX_SCREENS = 6; // Watch firmware 2.4.100+ (dashboard + 5 tile screens)
export const MAX_SCREENS_LEGACY_FIRMWARE = 4; // Older watch firmware; the phone app trims to the watch's cap
export const MAX_HOME_CONTROL_DEVICES = 8;

// Dashboard firmware limits (must match firmware constants)
export const DASHBOARD_MAX_STATUS_GROUPS = 5;
export const DASHBOARD_MIN_GLYPHS_PER_GROUP = 1;
export const DASHBOARD_MAX_GLYPHS_PER_GROUP = 10; // kMaxGlyphsPerGroup
export const DASHBOARD_MAX_SENSOR_GROUPS = 3;
export const DASHBOARD_MAX_SENSORS_PER_GROUP = 7; // SensorGroup.values array size

// Dashboard valid group types
export const DASHBOARD_STATUS_GROUP_TYPES = ['doors', 'garage', 'motion', 'lights', 'media'] as const;
export const DASHBOARD_SENSOR_GROUP_TYPES = ['thermostats', 'freezers', 'beacons'] as const;

// Dashboard valid entity domains
export const DASHBOARD_GLYPH_DOMAINS = ['binary_sensor', 'cover', 'light', 'switch', 'lock', 'media_player'] as const;
export const DASHBOARD_SENSOR_DOMAINS = ['sensor', 'climate', 'device_tracker', 'person'] as const;

// Dimmer limits
export const MIN_DIMMER_STEP = 1;
export const MAX_DIMMER_STEP = 25;
export const DEFAULT_DIMMER_STEP = 10;

// Color palette
export const COLORS: Record<StateColor, string> = {
  green: '#00C853',
  yellow: '#FFD600',
  red: '#FF1744',
  gray: '#9E9E9E',
  accent: '#18A1FF',
  white: '#FFFFFF',
};

// Theme backgrounds
export const THEME_BACKGROUNDS: Record<ThemePreset, string> = {
  charcoal: '#1E1E1E',
  black: '#000000',
};

// Default accent color
export const DEFAULT_ACCENT = '#18A1FF';

// Default tile entity-state colors (global for all tiles)
export const DEFAULT_ACTIVE_COLOR = '#FFD700';   // Gold
export const DEFAULT_INACTIVE_COLOR = '#800080';  // Purple

// Default long-away threshold (24 hours)
export const DEFAULT_LONG_AWAY_THRESHOLD = '24:00:00';

// Default soon window (1 hour)
export const DEFAULT_SOON_WINDOW = '01:00:00';

// Default update intervals
export const DEFAULT_MIN_UPDATE_INTERVAL_MS = 1000;
export const DEFAULT_FULL_REFRESH_MINUTES = 15;

// Entity domain constraints by tile/action type
export const TILE_TYPE_DOMAINS: Record<string, string[]> = {
  count: ['sensor', 'counter', 'input_number'],
  duration: ['sensor', 'timer'],
  state_text: ['sensor', 'input_text', 'binary_sensor'],
  cover_state: ['cover'],
  media_count: ['sensor'],
  sensor_value: ['sensor', 'input_number'],
};

// DEPRECATED: action buttons removed in v2
export const ACTION_TYPE_DOMAINS: Record<string, string[]> = {
  toggle: ['switch', 'light', 'input_boolean', 'fan'],
  'cover.toggle': ['cover'],
  'cover.open': ['cover'],
  'cover.close': ['cover'],
  'media.play_pause': ['media_player'],
  'script.run': ['script'],
  'scene.activate': ['scene'],
  'light.dimmer': ['light'],
};

// Default card configuration
export const DEFAULT_CONFIG: CardConfig = {
  type: 'custom:infinassistant-watchface',
  version: 1,
  name: 'InfinAssistant',
  theme: {
    preset: 'charcoal',
    accent: DEFAULT_ACCENT,
  },
  header: {
    time: {
      format: 'HH:mm',
      align: 'left',
    },
    presence: {
      enabled: true,
      home_zone: 'zone.home',
      long_away_threshold: DEFAULT_LONG_AWAY_THRESHOLD,
      icons: [],
    },
  },
  events: {
    enabled: false,
    calendars: [],
    max_events: 2,
    soon_window: DEFAULT_SOON_WINDOW,
    show_if_empty: false,
    all_day: 'show_all_day',
  },
  tiles: [],
  actions: [],
  screens: [],
  status_bar: {
    enabled: true,
    battery: true,
    bluetooth: true,
    steps: true,
    heart_rate: true,
    notifications: true,
    sources: {
      steps_entity: null,
      hr_entity: null,
      notifications_entity: null,
    },
  },
  advanced: {
    compression: true,
    min_update_interval_ms: DEFAULT_MIN_UPDATE_INTERVAL_MS,
    full_refresh_minutes: DEFAULT_FULL_REFRESH_MINUTES,
    debug: {
      show_bounds: false,
      show_truncation: false,
    },
  },
  logbook_app: {
    entities: [],
    hours_back: 12,
    max_entries: 10,
  },
  home_control: {
    devices: [],
  },
};

// Default tile configuration
export const DEFAULT_TILE_CONFIG = {
  enabled: false,
  label: '',
  icon: 'home' as const,
  displayMode: 'text' as const,
  type: 'sensor_value' as const,
  entity: '',
  color: 'auto' as const,
  rules: [],
  tap: 'none' as const,
  format: {
    prefix: '',
    suffix: '',
    unit: '',
    uppercase: true,
  },
};

// DEPRECATED: action buttons removed in v2
export const DEFAULT_ACTION_CONFIG = {
  enabled: false,
  label: '',
  icon: 'home' as const,
  entity: '',
  action: 'toggle' as const,
  state_color: true,
  dimmer: {
    step_percent: DEFAULT_DIMMER_STEP,
    swipe: true,
    longpress_overlay: false,
    on_brightness_default: 'last' as const,
    fixed_percent: 50,
  },
};

/** The editor's tabs, in order: the card's list of validation messages names each one's tab. */
export const EDITOR_TABS: ReadonlyArray<{ id: EditorTab; label: string }> = [
  { id: 'settings',     label: 'Settings' },
  { id: 'screens',      label: 'Screens' },
  { id: 'calendar',     label: 'Calendar' },
  { id: 'logbook',      label: 'Logbook' },
  { id: 'home_control', label: 'Home Control' },
];

// Card name for registration
export const CARD_TAG = 'infinassistant-watchface';
export const EDITOR_TAG = 'infinassistant-watchface-editor';
/** The bundle's file name, as the integration serves it and a manual install copied it. */
export const CARD_BUNDLE = 'infinassistant-watchface.js';
