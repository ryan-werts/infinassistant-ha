/**
 * Type definitions for InfinAssistant Watch Face Card
 */

// Home Assistant types (minimal declarations for what we use)
export interface HomeAssistant {
  states: Record<string, HassEntity>;
  /** The entity registry as the frontend has it: the preview resolves a device tile with it. */
  entities?: Record<string, { entity_id: string; device_id?: string | null }>;
  callService(domain: string, service: string, data?: Record<string, unknown>): Promise<void>;
  connection: {
    subscribeEvents(callback: (event: HassEvent) => void, eventType: string): Promise<() => void>;
    sendMessagePromise(msg: Record<string, unknown>): Promise<unknown>;
  };
}

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

export interface HassEvent {
  event_type: string;
  data: Record<string, unknown>;
}

export interface LovelaceCard extends HTMLElement {
  hass?: HomeAssistant;
  setConfig(config: CardConfig): void;
  getCardSize(): number;
}

export interface LovelaceCardEditor extends HTMLElement {
  hass?: HomeAssistant;
  lovelace?: { config: unknown };
  setConfig(config: CardConfig): void;
}

// Glyph types
export type GlyphId =
  | 'truck'
  | 'car'
  | 'person_male'
  | 'person_female'
  | 'door'
  | 'garage'
  | 'music'
  | 'light'
  | 'tv'
  | 'home'
  | 'fan'
  | 'fire'
  | 'battery'
  | 'bluetooth'
  | 'heart'
  | 'steps'
  | 'bell';

export type PresenceIconType = 'truck' | 'car' | 'person_male' | 'person_female';

// Theme
export type ThemePreset = 'charcoal' | 'black';
export type TimeFormat = 'HH:mm' | 'hh:mm';
export type TimeAlign = 'left' | 'center' | 'right';
export type AllDayHandling = 'show_all_day' | 'hide' | 'banner';

// Tile types
export type TileType =
  | 'count'
  | 'duration'
  | 'state_text'
  | 'cover_state'
  | 'media_count'
  | 'sensor_value';

export type TileColorMode = 'auto' | 'manual' | 'disabled';  // 'manual' treated same as 'auto' (legacy compat)

export type TapAction = 'none' | 'toggle' | 'more-info' | 'service';

export function isValidTapAction(value: unknown): value is TapAction {
    return typeof value === 'string' &&
           ['none', 'toggle', 'more-info', 'service'].includes(value);
}

// Action types
export type ActionType =
  | 'toggle'
  | 'cover.toggle'
  | 'cover.open'
  | 'cover.close'
  | 'media.play_pause'
  | 'script.run'
  | 'scene.activate'
  | 'light.dimmer'
  | 'service_call'
  | 'device_action';

export type DimmerOnDefault = 'last' | 'fixed';

// State colors
export type StateColor = 'green' | 'yellow' | 'red' | 'gray' | 'accent' | 'white';

// Presence states
export type PresenceState = 'home' | 'away' | 'long_away' | 'unknown';

// Cover states
export type CoverState = 'open' | 'opening' | 'closing' | 'closed' | 'unavailable';

// Media states
export type MediaState = 'playing' | 'paused' | 'idle' | 'off' | 'unavailable';

// Config interfaces
export interface PresenceIconConfig {
  icon: PresenceIconType;
  entity: string;
  hide_if_unknown: boolean;
}

export interface PresenceConfig {
  enabled: boolean;
  home_zone: string;
  long_away_threshold: string; // ISO duration like "24:00:00"
  icons: PresenceIconConfig[];
}

export interface TimeConfig {
  format: TimeFormat;
  align: TimeAlign;
}

export interface HeaderConfig {
  time: TimeConfig;
  presence: PresenceConfig;
}

export interface EventsConfig {
  enabled: boolean;
  calendars: string[];
  max_events: number; // 0-3
  soon_window: string; // ISO duration
  show_if_empty: boolean;
  all_day: AllDayHandling;
}

export interface ColorRule {
  condition: string;
  color: StateColor;
}

export interface TileFormatConfig {
  prefix: string;
  suffix: string;
  unit: string;
  uppercase: boolean;
}

export type TileDisplayMode = 'text' | 'icon';

export interface TileConfig {
  enabled: boolean;
  label: string;
  icon: GlyphId;
  displayMode: TileDisplayMode;  // 'text' = show label text (default), 'icon' = show icon glyph
  type: TileType;
  device_id?: string;  // Optional device to filter entities or target device actions
  entity: string;      // Entity ID (optional if device_id is set for device-level actions)
  color: TileColorMode;
  activeColor?: string;    // DEPRECATED: use theme.activeColor for global override
  inactiveColor?: string;  // DEPRECATED: use theme.inactiveColor for global override
  rules: ColorRule[];
  tap: TapAction;
  format: TileFormatConfig;
}

export interface DimmerConfig {
  step_percent: number; // 1-25
  swipe: boolean;
  longpress_overlay: boolean;
  on_brightness_default: DimmerOnDefault;
  fixed_percent: number; // 1-100
}

export interface ActionConfig {
  enabled: boolean;
  label: string;
  icon: GlyphId;
  entity: string;
  action: ActionType;
  state_color: boolean;
  dimmer?: DimmerConfig;
  // For service_call type
  domain?: string;
  service?: string;
  // For device_action type
  device_id?: string;
  device_action?: string;
}

export interface StatusBarSources {
  steps_entity: string | null;
  hr_entity: string | null;
  notifications_entity: string | null;
}

export interface StatusBarConfig {
  enabled: boolean;
  battery: boolean;
  bluetooth: boolean;
  steps: boolean;
  heart_rate: boolean;
  notifications: boolean;
  sources: StatusBarSources;
}

export interface DebugConfig {
  show_bounds: boolean;
  show_truncation: boolean;
}

export interface AdvancedConfig {
  compression: boolean;
  min_update_interval_ms: number;
  full_refresh_minutes: number;
  debug: DebugConfig;
}

export interface ThemeConfig {
  preset: ThemePreset;
  accent?: string;
  activeColor?: string;    // Global active tile color (default: #FFD700 gold)
  inactiveColor?: string;  // Global inactive tile color (default: #800080 purple)
}

// Multi-screen support types
export type ScreenType = 'dashboard' | 'tiles';
export type TileLayout = 4; // 4 = 2×2 grid only

export interface GlyphConfig {
  symbol: string;
  entity: string;
}

export interface StatusGroupConfig {
  type: 'doors' | 'garage' | 'motion' | 'lights' | 'media';
  glyphs: GlyphConfig[];
}

export interface SensorConfig {
  entity: string;
  displayType: 'temperature' | 'presence';
  symbol?: string; // For beacon/presence display (character or icon)
}

export interface SensorGroupConfig {
  type: 'thermostats' | 'freezers' | 'beacons';
  sensors: SensorConfig[];
}

export interface WeatherConfig {
  entity: string;
}

export interface EventConfig {
  calendar: string;
}

export interface NotificationConfig {
  source: string;
}

export interface DashboardInlineMetricConfig {
  label?: string;    // Max 2 chars, rendered as cyan label beside the clock
  entity: string;    // HA entity whose state is shown as the metric value
  round?: boolean;   // Round numeric value before display
  unit?: string;     // Optional unit suffix appended to value
}

export interface DashboardConfigurableValueConfig {
  label?: string;      // Max 11 chars, shown before the entity state
  entity: string;      // HA entity whose state is shown as the headline value
  truncateTo?: number; // Max chars for the value portion (firmware default: 19)
}

export interface DashboardConfig {
  statusGroups: StatusGroupConfig[];
  sensorGroups: SensorGroupConfig[];
  weather?: WeatherConfig;
  events?: EventConfig[];
  notifications?: NotificationConfig[];
  presence?: PresenceConfig;
  configurableValue?: DashboardConfigurableValueConfig;
  inlineMetrics?: [DashboardInlineMetricConfig?, DashboardInlineMetricConfig?];
}

export interface LogbookConfig {
  entityIds: string[];
  maxEntries: number;  // 1-15
  hoursBack: number;   // 1-48
}

export interface LogbookAppConfig {
  entities: string[];   // HA entity IDs to track
  hours_back: number;  // 1-48, default 12
  max_entries: number; // 1-15, default 10
}

export interface HomeControlDevice {
  entity_id: string;
  name?: string;
  domain?: string; // light, switch, cover, climate, fan, lock
}

export interface HomeControlConfig {
  devices: HomeControlDevice[];
}

export interface ScreenConfig {
  screenType: ScreenType;
  name?: string; // User-friendly name for tab
  tileLayout?: TileLayout; // 4 = 2×2 grid (default)
  tiles?: TileConfig[];
  dashboard?: DashboardConfig;
}

export interface CardConfig {
  type: 'custom:infinassistant-watchface';
  version: number;
  name?: string;
  device_id?: string; // InfinAssistant device ID for pushing watch face
  theme: ThemeConfig;
  header: HeaderConfig;
  events: EventsConfig;
  screens?: ScreenConfig[]; // Multi-screen support (max 6; more than 4 needs watch firmware 2.4.100+)
  tiles: TileConfig[]; // DEPRECATED: use screens instead
  actions: ActionConfig[]; // DEPRECATED: use screens instead
  status_bar: StatusBarConfig;
  advanced: AdvancedConfig;
  logbook_app?: LogbookAppConfig;
  home_control?: HomeControlConfig;
}

// Validation result types
export type ValidationSeverity = 'error' | 'warning' | 'info';

export type EditorTab =
  | 'settings'
  | 'screens'
  | 'calendar'
  | 'logbook'
  | 'home_control';

export interface ValidationMessage {
  severity: ValidationSeverity;
  message: string;
  tab: EditorTab;
  field?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
  info: ValidationMessage[];
  byTab: Record<EditorTab, ValidationMessage[]>;
}

// Watch Layout JSON types (export format) - CONFIG ONLY, no live state data
// The Android app queries HA for current entity states based on these entity IDs

export interface WatchLayoutPresenceIcon {
  type: PresenceIconType;
  entity: string;  // Entity ID to query for state
  hideIfUnknown: boolean;
}

export interface WatchLayoutPresenceConfig {
  enabled: boolean;
  homeZone: string;
  longAwayThreshold: string;  // ISO duration like "24:00:00"
  icons: WatchLayoutPresenceIcon[];
}

export interface WatchLayoutEventsConfig {
  enabled: boolean;
  calendars: string[];  // Calendar entity IDs
  maxEvents: number;
  soonWindow: string;  // ISO duration
  showIfEmpty: boolean;
  allDay: AllDayHandling;
}

export interface WatchLayoutTileFormat {
  prefix: string;
  suffix: string;
  unit: string;
  uppercase: boolean;
}

export interface WatchLayoutTileRule {
  condition: string;
  color: StateColor;
}

export interface WatchLayoutTile {
  label: string;
  icon?: GlyphId;
  displayMode?: number;  // 0 = text label (default), 1 = icon glyph
  device_id?: string;  // Device ID for device-level targeting (optional)
  entity: string;      // Entity ID to query (optional if device_id is set)
  type: TileType;
  colorMode: TileColorMode;
  rules: WatchLayoutTileRule[];
  tap: TapAction;
  format: WatchLayoutTileFormat;
}

export interface WatchLayoutAction {
  label: string;
  icon?: GlyphId;
  entity: string;  // Entity ID for state color
  actionType: ActionType;
  stateColor: boolean;  // Whether to derive color from entity state
  dimmer?: DimmerConfig;
  // For service_call type
  domain?: string;
  service?: string;
  // For device_action type
  deviceId?: string;
  deviceAction?: string;
}

export interface WatchLayoutStatusBarItem {
  enabled: boolean;
  entity: string | null;  // Entity ID or null for watch source
}

export interface WatchLayoutStatusBar {
  enabled: boolean;
  battery?: WatchLayoutStatusBarItem;
  bluetooth?: WatchLayoutStatusBarItem;
  steps?: WatchLayoutStatusBarItem;
  heartRate?: WatchLayoutStatusBarItem;
  notifications?: WatchLayoutStatusBarItem;
}

// Watch Layout export types (multi-screen) - CONFIG ONLY
export interface WatchLayoutGlyph {
  symbol: string;
  entity: string;  // Entity ID to query for active state
}

export interface WatchLayoutStatusGroup {
  type: string;
  glyphs: WatchLayoutGlyph[];
}

export interface WatchLayoutSensor {
  entity: string;  // Entity ID to query
  displayType: 'temperature' | 'presence';
  symbol?: string;  // For beacon/presence display
}

export interface WatchLayoutSensorGroup {
  type: string;
  sensors: WatchLayoutSensor[];
}

export interface WatchLayoutWeather {
  entity: string;  // Weather entity ID to query
}

export interface WatchLayoutCalendar {
  calendar: string;  // Calendar entity ID
}

export interface WatchLayoutNotificationSource {
  source: string;  // Notification source identifier
}

export interface WatchLayoutConfigurableValue {
  label: string;       // Display label (0-11 chars)
  entity: string;      // HA entity ID to resolve
  truncateTo?: number; // Max value chars (default 19)
}

export interface WatchLayoutInlineMetric {
  label: string;       // Display label (0-2 chars)
  entity: string;      // HA entity ID to resolve
  round?: boolean;
}

export interface WatchLayoutDashboard {
  statusGroups: WatchLayoutStatusGroup[];
  sensorGroups: WatchLayoutSensorGroup[];
  weather?: WatchLayoutWeather;
  events?: WatchLayoutCalendar[];
  notifications?: WatchLayoutNotificationSource[];
  configurableValue?: WatchLayoutConfigurableValue;
  inlineMetrics?: Array<WatchLayoutInlineMetric | null>;
}

export interface WatchLayoutLogbook {
  entityIds: string[];   // Entity IDs to fetch logbook for
  maxEntries: number;    // Max entries (1-15)
  hoursBack: number;     // Hours to look back (1-48)
}

export interface WatchLayoutScreen {
  screenType: number; // 0 = dashboard, 1 = tiles
  name?: string;
  tileLayout?: number; // 4 = 2×2 grid
  tiles?: WatchLayoutTile[];
  dashboard?: WatchLayoutDashboard;
}

export interface WatchLayoutLogbookApp {
  entityIds: string[];  // Entity IDs to fetch logbook for
  maxEntries: number;   // Max entries (1-15)
  hoursBack: number;    // Hours to look back (1-48)
}

export interface WatchLayoutHomeControlDevice {
  entityId: string;
  name?: string;
  domain?: string;
}

export interface WatchLayoutHomeControl {
  devices: WatchLayoutHomeControlDevice[];
}

export interface WatchLayoutJSON {
  version: number;
  theme: {
    background: string;
    accent: string;
  };
  header: {
    time: {
      format: TimeFormat;
      align: TimeAlign;
    };
    presence: WatchLayoutPresenceConfig;
  };
  statusBar: WatchLayoutStatusBar;
  events: WatchLayoutEventsConfig;
  screens: WatchLayoutScreen[];
  logbookApp?: WatchLayoutLogbookApp;
  homeControl?: WatchLayoutHomeControl;
  // Global tile colors for entity-state dynamic coloring
  defaultActiveColor: string;   // Hex color when entity is active (default: #FFD700)
  defaultInactiveColor: string; // Hex color when entity is inactive (default: #800080)
  // DEPRECATED fields for backwards compatibility (omitted when screens are present)
  tiles?: WatchLayoutTile[];  // DEPRECATED: use screens[].tiles
  actions?: WatchLayoutAction[];  // DEPRECATED: actions removed in v2; tiles are the interactive elements
}

// State mapping result types
export interface StateMappingResult {
  displayValue: string;
  color: StateColor;
}

export interface PresenceStateMappingResult {
  state: PresenceState;
  color: StateColor;
}

// Discovered logbook card (for import feature)
export interface DiscoveredLogbookCard {
  title: string;
  entities: string[];
  dashboardTitle: string;
  viewTitle: string;
}

// Simulator state for preview
export interface SimulatorState {
  garage: 'open' | 'closed';
  media: 'playing' | 'paused' | 'idle';
  presence: 'home' | 'away' | 'long_away';
  notifications: number;
  bluetooth: boolean;
  battery: number;
  steps: number;
  heartRate: number;
  /** The watch's copy of the dashboard's live state is over 30 min old: the house status greys. */
  stale?: boolean;
}
