/**
 * InfinAssistant Watch Face Card
 *
 * Main Lovelace card component that renders the watch face preview
 * and provides access to the visual editor.
 */

import { LitElement, html, svg, css, nothing, type TemplateResult, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import type {
  CardConfig,
  HomeAssistant,
  LovelaceCard,
  SimulatorState,
  WatchLayoutJSON,
  WatchLayoutTile,
  WatchLayoutAction,
  WatchLayoutDashboard,
  WatchLayoutScreen,
} from './types';
import { DEFAULT_CONFIG, CARD_BUNDLE, CARD_TAG, EDITOR_TAG } from './constants';
import { listedMessages, validateConfig } from './validator';
import type { ValidationResult } from './types';
import {
  exportWatchLayout,
  estimatePayloadSize,
  copyLayoutToClipboard,
} from './watch-layout-exporter';
import { getGlyphPath } from './glyph-registry';
import { sharedStyles, previewStyles } from './styles';
import {
  TILE_ACCENT_DEFAULT,
  TILE_FRAME,
  TILE_GROUND,
  TILE_ICON_MDI,
  TILE_STATE_OFF,
  formatTileState,
  hexColor,
  isActiveState,
  litGround,
  nameWraps,
  tilePosition,
} from './tile-preview';
import {
  DASH_BASE,
  DASH_FAINT,
  DASH_GREY,
  DASH_ICON,
  DASH_INK,
  DASH_RED,
  DASH_RULE,
  DASH_WHITE,
  PILL,
  TITLE_X,
  batteryIcon,
  calendarEvents,
  dashboardCalendars,
  dashboardPreview,
  forecastHiLo,
  formatHeartRate,
  legacyHiLo,
  pillX,
  type DashEvent,
} from './dashboard-preview';
import './infinassistant-watchface-editor';
import { noteCopy, unrecordedCopies, unrecordedCopyWarning, type CardCopy, type LoadedCopies } from './load-guard';

/** The package version and a hash of what the bundle is built from (vite.config.ts). */
declare const __CARD_VERSION__: string;

const SELF: CardCopy = { version: __CARD_VERSION__, url: import.meta.url };
const LOADED: LoadedCopies = (window.__infinassistantWatchface ??= { copies: [] });
// Before the card is defined below: whether an earlier copy defined it decides which one is used.
const loadWarning = noteCopy(LOADED, SELF, customElements.get(CARD_TAG) !== undefined);
if (loadWarning) console.warn(loadWarning);
let copiesChecked = false;

// Use conditional registration to avoid "already defined" errors on hot reload
const defineCard = (tagName: string) => {
  return (classOrDescriptor: typeof LitElement) => {
    if (!customElements.get(tagName)) {
      customElements.define(tagName, classOrDescriptor);
    }
    return classOrDescriptor;
  };
};

@defineCard(CARD_TAG)
export class InfinassistantWatchfaceCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) hass?: HomeAssistant;

  @state() private _config: CardConfig = DEFAULT_CONFIG;
  @state() private _validation: ValidationResult | null = null;
  @state() private _watchLayout: WatchLayoutJSON | null = null;
  @state() private _copied = false;
  @state() private _showJson = false;
  /** Whether the banner lists its errors and warnings: tapping it toggles them. */
  @state() private _showMessages = false;
  @state() private _simulator: SimulatorState = {
    garage: 'closed',
    media: 'idle',
    presence: 'home',
    notifications: 0,
    bluetooth: true,
    battery: 75,
    steps: 5234,
    heartRate: 78,
  };

  /** The layout screen the preview shows; the arrows under it step through them, as a swipe does on the watch. */
  @state() private _previewScreen = 0;

  /** Today's high and low per weather entity (weather.get_forecasts, as the app reads them), and when read. */
  @state() private _forecast: Record<string, { hiLo: [number, number] | null; at: number }> = {};
  private _forecastPending = new Set<string>();

  /**
   * The dashboard's events per set of calendars (calendar.get_events, as the app reads them), and
   * when read; null when HA could not give them, and each calendar entity's own event stands in.
   */
  @state() private _events: Record<string, { events: DashEvent[] | null; at: number }> = {};
  private _eventsPending = new Set<string>();

  @state() private _pushSuccess = false;
  @state() private _pushError: string | null = null;

  // Timeout IDs for cleanup (L5 fix)
  private _copyTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private _pushSuccessTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private _pushErrorTimeoutId: ReturnType<typeof setTimeout> | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    // A copy from an old Lovelace resource records nothing: it is found by its script.
    if (!copiesChecked) {
      copiesChecked = true;
      const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]'), (s) => s.src);
      for (const url of unrecordedCopies(LOADED, scripts, CARD_BUNDLE)) console.warn(unrecordedCopyWarning(SELF, url));
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    // Clear all pending timeouts to prevent memory leaks (L5 fix)
    if (this._copyTimeoutId !== null) {
      clearTimeout(this._copyTimeoutId);
      this._copyTimeoutId = null;
    }
    if (this._pushSuccessTimeoutId !== null) {
      clearTimeout(this._pushSuccessTimeoutId);
      this._pushSuccessTimeoutId = null;
    }
    if (this._pushErrorTimeoutId !== null) {
      clearTimeout(this._pushErrorTimeoutId);
      this._pushErrorTimeoutId = null;
    }
  }

  static styles = [
    sharedStyles,
    previewStyles,
    css`
      :host {
        display: block;
      }

      ha-card {
        overflow: hidden;
      }

      .card-header {
        padding: 16px 16px 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .card-title {
        font-size: 18px;
        font-weight: 500;
      }

      .card-actions {
        display: flex;
        gap: 8px;
        padding: 8px 16px 16px;
        justify-content: center;
      }

      .json-output {
        margin: 0 16px 16px;
        padding: 12px;
        background: var(--secondary-background-color, #f5f5f5);
        border-radius: 4px;
        font-family: monospace;
        font-size: 11px;
        max-height: 200px;
        overflow: auto;
        white-space: pre-wrap;
        word-break: break-all;
      }

      .toggle-json-btn {
        background: none;
        border: 1px solid var(--divider-color, #e0e0e0);
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
      }

      .toggle-json-btn:hover {
        background: var(--secondary-background-color, #f5f5f5);
      }

      /* Simulator panel */
      .simulator-panel {
        background: var(--secondary-background-color, #f5f5f5);
        border-radius: 4px;
        padding: 12px;
        margin-top: 12px;
      }

      .simulator-title {
        font-size: 12px;
        font-weight: 500;
        margin-bottom: 8px;
        color: var(--secondary-text-color, #757575);
      }

      .simulator-controls {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
      }

      .simulator-control {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .simulator-control label {
        font-size: 10px;
        color: var(--secondary-text-color, #757575);
      }

      .simulator-control select,
      .simulator-control input {
        padding: 4px;
        font-size: 12px;
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: 2px;
      }
    `,
  ];

  setConfig(config: Partial<CardConfig>): void {
    // Merge with defaults
    this._config = {
      ...DEFAULT_CONFIG,
      ...config,
      theme: { ...DEFAULT_CONFIG.theme, ...config.theme },
      header: {
        ...DEFAULT_CONFIG.header,
        ...config.header,
        time: { ...DEFAULT_CONFIG.header.time, ...config.header?.time },
        presence: {
          ...DEFAULT_CONFIG.header.presence,
          ...config.header?.presence,
          icons: config.header?.presence?.icons || [],
        },
      },
      events: { ...DEFAULT_CONFIG.events, ...config.events },
      status_bar: {
        ...DEFAULT_CONFIG.status_bar,
        ...config.status_bar,
        sources: { ...DEFAULT_CONFIG.status_bar.sources, ...config.status_bar?.sources },
      },
      advanced: {
        ...DEFAULT_CONFIG.advanced,
        ...config.advanced,
        debug: { ...DEFAULT_CONFIG.advanced.debug, ...config.advanced?.debug },
      },
      tiles: config.tiles || [],
      actions: config.actions || [],
    } as CardConfig;

    this._updateLayout();
  }

  getCardSize(): number {
    return 6;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (changedProps.has('hass')) {
      this._updateLayout();
    }
    if (changedProps.has('hass') || changedProps.has('_previewScreen') || changedProps.has('_watchLayout')) {
      this._readForecast();
      this._readEvents();
    }
  }

  /**
   * Reads the dashboard's events on preview, at most every 15 min (the app sends the watch a state
   * at least that often): the next week's, the first eight per calendar, as the app reads them. A
   * calendar entity holds only its next event, so the two the watch shows can be missing from them.
   */
  private _readEvents(): void {
    const layout = this._watchLayout;
    const screens = layout?.screens ?? [];
    const screen = screens[Math.min(this._previewScreen, Math.max(screens.length - 1, 0))];
    const dashboard = screen?.screenType === 0 ? screen.dashboard : undefined;
    const send = this.hass?.connection?.sendMessagePromise;
    if (!layout || !dashboard || !send) return;
    const calendars = dashboardCalendars(dashboard, layout);
    const key = calendars.join(',');
    if (calendars.length === 0 || this._eventsPending.has(key)) return;
    const read = this._events[key];
    if (read && Date.now() - read.at < 15 * 60_000) return;
    this._eventsPending.add(key);
    send.call(this.hass!.connection, {
      type: 'call_service',
      domain: 'calendar',
      service: 'get_events',
      service_data: { duration: { days: 7 } },
      target: { entity_id: calendars },
      return_response: true,
    })
      .then((result) => calendarEvents(result, calendars))
      .catch(() => null)
      .then((events) => {
        this._events = { ...this._events, [key]: { events, at: Date.now() } };
        this._eventsPending.delete(key);
      });
  }

  /**
   * Reads today's high and low for the dashboard on preview, at most every 30 min: HA has given
   * them only through weather.get_forecasts since 2024.4, so a state carries none.
   */
  private _readForecast(): void {
    const screens = this._watchLayout?.screens ?? [];
    const screen = screens[Math.min(this._previewScreen, Math.max(screens.length - 1, 0))];
    const entityId = screen?.screenType === 0 ? screen.dashboard?.weather?.entity : undefined;
    const send = this.hass?.connection?.sendMessagePromise;
    if (!entityId || !send || this._forecastPending.has(entityId)) return;
    const read = this._forecast[entityId];
    if (read && Date.now() - read.at < 30 * 60_000) return;
    this._forecastPending.add(entityId);
    send.call(this.hass!.connection, {
      type: 'call_service',
      domain: 'weather',
      service: 'get_forecasts',
      service_data: { type: 'daily' },
      target: { entity_id: entityId },
      return_response: true,
    })
      .then((result) => forecastHiLo(result, entityId))
      .catch(() => null)
      .then((hiLo) => {
        this._forecast = { ...this._forecast, [entityId]: { hiLo, at: Date.now() } };
        this._forecastPending.delete(entityId);
      });
  }

  private _updateLayout(): void {
    try {
      this._validation = validateConfig(this._config, this.hass);
      // Export config-only layout (no state data)
      this._watchLayout = exportWatchLayout(this._config);
    } catch (error) {
      console.error('Error updating watch face layout:', error);
      // Provide fallback empty layout with properly initialized byTab
      this._validation = {
        valid: false,
        errors: [],
        warnings: [],
        info: [],
        byTab: {
          settings: [],
          screens: [],
          calendar: [],
          logbook: [],
          home_control: [],
        },
      };
      this._watchLayout = null;
    }
    // Nothing left to list closes the list, so it does not reopen by itself when messages come back.
    if (listedMessages(this._validation).length === 0) this._showMessages = false;
  }

  private async _handleCopyJson(): Promise<void> {
    if (!this._watchLayout) return;

    const success = await copyLayoutToClipboard(this._watchLayout);
    if (success) {
      this._copied = true;
      // Clear any existing timeout before setting a new one (L5 fix)
      if (this._copyTimeoutId !== null) {
        clearTimeout(this._copyTimeoutId);
      }
      this._copyTimeoutId = setTimeout(() => {
        this._copied = false;
        this._copyTimeoutId = null;
      }, 2000);
    }
  }

  private async _handlePushToWatch(): Promise<void> {
    if (!this._watchLayout || !this._config.device_id || !this.hass) return;

    this._pushError = null;
    this._pushSuccess = false;

    try {
      await this.hass.callService('infinassistant', 'push_watchface_layout', {
        device_id: this._config.device_id,
        layout: this._watchLayout,
      });

      this._pushSuccess = true;
      // Clear any existing timeout before setting a new one (L5 fix)
      if (this._pushSuccessTimeoutId !== null) {
        clearTimeout(this._pushSuccessTimeoutId);
      }
      this._pushSuccessTimeoutId = setTimeout(() => {
        this._pushSuccess = false;
        this._pushSuccessTimeoutId = null;
      }, 3000);
    } catch (err) {
      this._pushError = err instanceof Error ? err.message : 'Unknown error';
      // Clear any existing timeout before setting a new one (L5 fix)
      if (this._pushErrorTimeoutId !== null) {
        clearTimeout(this._pushErrorTimeoutId);
      }
      this._pushErrorTimeoutId = setTimeout(() => {
        this._pushError = null;
        this._pushErrorTimeoutId = null;
      }, 5000);
    }
  }

  private _toggleJson(): void {
    this._showJson = !this._showJson;
  }

  static getConfigElement(): HTMLElement {
    return document.createElement(EDITOR_TAG);
  }

  static getStubConfig(): Partial<CardConfig> {
    return {
      type: 'custom:infinassistant-watchface',
      version: 1,
      name: 'My Watch Face',
    };
  }

  protected render(): TemplateResult {
    const payloadSize = this._watchLayout ? estimatePayloadSize(this._watchLayout) : 0;

    return html`
      <ha-card>
        <div class="card-header">
          <span class="card-title">${this._config.name || 'InfinAssistant'}</span>
          <button
            class="toggle-json-btn"
            @click=${this._toggleJson}
            aria-label=${this._showJson ? 'Hide JSON output' : 'Show JSON output'}
            aria-expanded=${this._showJson}
          >
            ${this._showJson ? 'Hide JSON' : 'Show JSON'}
          </button>
        </div>

        <div class="card-content">
          ${this._renderValidationBanner(payloadSize)}
          ${this._renderWatchPreview()}
          ${this._renderSimulator()}
        </div>

        ${this._showJson ? this._renderJsonOutput() : nothing}

        <div class="card-actions">
          <button
            class="copy-button ${this._copied ? 'copied' : ''}"
            @click=${this._handleCopyJson}
            aria-label="Copy watch layout JSON to clipboard"
            aria-live="polite"
          >
            ${this._copied ? 'Copied!' : 'Copy Watch Layout JSON'}
          </button>
          <button
            class="push-button ${this._pushSuccess ? 'success' : ''} ${this._pushError ? 'error' : ''}"
            @click=${this._handlePushToWatch}
            ?disabled=${!this._config.device_id || !this._watchLayout}
            aria-label="Push watch face layout to watch"
            aria-live="polite"
          >
            ${this._pushSuccess ? 'Pushed!' : this._pushError ? 'Failed' : 'Push to Watch'}
          </button>
        </div>
        ${this._pushError
          ? html`<div class="push-error" role="alert">Error: ${this._pushError}</div>`
          : nothing}
      </ha-card>
    `;
  }

  /**
   * The validation summary. Tapping it lists the errors, then the warnings, each with its tab
   * and field, so the counts say what to fix and where.
   *
   * Only the summary is the live region. Around the button it would read out the button too,
   * and inside the button it would be lost: a button's content is presentational. So the button
   * is the chevron, stretched over the banner (styles.ts), and the list is in the DOM whenever
   * there is one, hidden while closed, so aria-controls always names it.
   */
  private _renderValidationBanner(payloadSize: number): TemplateResult {
    const valid = this._validation?.valid ?? true;
    const errorCount = this._validation?.errors.length ?? 0;
    const warningCount = this._validation?.warnings.length ?? 0;
    const listed = listedMessages(this._validation);
    const expandable = listed.length > 0;
    const open = this._showMessages && expandable;
    const count = (n: number, what: string) => `${n} ${what}${n !== 1 ? 's' : ''}`;
    const summary = [
      valid ? 'Valid configuration' : count(errorCount, 'error'),
      ...(warningCount > 0 ? [count(warningCount, 'warning')] : []),
    ].join(', ');

    return html`
      <div class="validation-banner ${valid ? 'valid' : 'invalid'} ${expandable ? 'expandable' : ''}">
        <span class="icon" aria-hidden="true">${valid ? '\u2705' : '\u274C'}</span>
        <span role="status">${summary}</span>
        <span class="payload-size">${Math.round(payloadSize / 1024 * 10) / 10} KB</span>
        ${expandable
          ? html`
              <button
                class="validation-toggle"
                aria-label="Errors and warnings"
                aria-expanded=${open ? 'true' : 'false'}
                aria-controls="validation-list"
                @click=${() => { this._showMessages = !this._showMessages; }}
              ><span class="validation-chevron" aria-hidden="true">${open ? '\u25B4' : '\u25BE'}</span></button>
            `
          : nothing}
      </div>
      ${expandable
        ? html`
            <ul id="validation-list" class="validation-list" aria-label="Errors and warnings" ?hidden=${!open}>
              ${listed.map((m) => html`
                <li class="validation-item ${m.severity}">
                  <span class="validation-item-icon" role="img" aria-label=${m.severity === 'error' ? 'Error' : 'Warning'}>${m.severity === 'error' ? '\u274C' : '\u26A0\uFE0F'}</span>
                  <span class="validation-item-body">
                    <span>${m.message}</span>
                    <span class="validation-item-where">${m.tabLabel}${m.field ? html` \u00B7 <code>${m.field}</code>` : nothing}</span>
                  </span>
                </li>
              `)}
            </ul>
          `
        : nothing}
    `;
  }

  private _renderWatchPreview(): TemplateResult {
    if (!this._watchLayout) {
      return html`<div class="watch-preview charcoal">Loading...</div>`;
    }

    const layout = this._watchLayout;
    const debugClass = this._config.advanced.debug.show_bounds ? 'debug-bounds' : '';
    const screens = layout.screens ?? [];
    const index = Math.min(this._previewScreen, Math.max(screens.length - 1, 0));
    const screen = screens[index];

    return html`
      <div
        class="watch-preview ${this._config.theme.preset} ${debugClass}"
        style="--accent-color: ${layout.theme.accent}"
      >
        ${screen !== undefined ? this._renderScreen(layout, screen, index, screens.length) : this._renderLegacyScreen(layout)}
        ${screen === undefined ? this._renderStatusBar(layout) : nothing}
      </div>
      ${screens.length > 1
        ? html`
            <div class="preview-nav">
              <button
                aria-label="Previous screen"
                ?disabled=${index === 0}
                @click=${() => { this._previewScreen = index - 1; }}
              >&#x2039;</button>
              <span>Screen ${index + 1} of ${screens.length}</span>
              <button
                aria-label="Next screen"
                ?disabled=${index === screens.length - 1}
                @click=${() => { this._previewScreen = index + 1; }}
              >&#x203A;</button>
            </div>
          `
        : nothing}
    `;
  }

  private _renderScreen(layout: WatchLayoutJSON, screen: WatchLayoutScreen, index: number, count: number): TemplateResult {
    if (screen.screenType === 0 && screen.dashboard) {
      return this._renderDashboardScreen(layout, screen.dashboard, index, count);
    }
    return this._renderTileScreen(layout, screen.tiles ?? [], index, count);
  }

  private _renderLegacyScreen(layout: WatchLayoutJSON): TemplateResult {
    // Legacy format: render events, tiles, and actions
    return html`
      ${this._renderHeader(layout)}
      ${this._renderEvents(layout)}
      ${this._renderTiles(layout)}
      ${this._renderActions(layout)}
    `;
  }

  /**
   * A tile screen as the watch draws it (firmware 2.4.94; tile-preview.ts): up to 4 dark framed
   * tiles with the name over the state, the active colour while on, and the "n/N" indicator. Until
   * this the preview drew a clock plate with steps and heart rate above small tiles and the
   * actions, none of which the watch shows on a tile screen.
   */
  private _renderTileScreen(layout: WatchLayoutJSON, tiles: WatchLayoutTile[], index: number, count: number): TemplateResult {
    const stateAccent = hexColor(layout.defaultActiveColor, TILE_ACCENT_DEFAULT);
    return html`
      <div class="watch-tile-screen">
        ${tiles.slice(0, 4).map((tile, i) => this._renderWatchTile(tile, i, stateAccent))}
        ${count > 1 ? html`<div class="watch-screen-indicator">${index + 1}/${count}</div>` : nothing}
      </div>
    `;
  }

  private _renderWatchTile(tile: WatchLayoutTile, index: number, stateAccent: string): TemplateResult {
    const { left, top } = tilePosition(index);
    const ownColor = tile.colorMode === 'disabled';
    const accent = ownColor ? TILE_ACCENT_DEFAULT : stateAccent;
    const state = this._tileState(tile);
    const lit = !ownColor && isActiveState(state);
    const icon = tile.displayMode === 1 && tile.icon ? TILE_ICON_MDI[tile.icon] : undefined;
    const name = tile.label || '';
    const tight = icon === undefined && state !== null && nameWraps(name);
    const style = [
      `left: ${left}px`,
      `top: ${top}px`,
      `background: ${lit ? litGround(accent) : TILE_GROUND}`,
      `border-color: ${lit || ownColor ? accent : TILE_FRAME}`,
    ].join('; ');
    return html`
      <div class="watch-tile2 ${tight ? 'tight' : ''}" style=${style}>
        ${icon !== undefined
          ? html`<ha-icon class="watch-tile2-icon" icon=${icon}></ha-icon>`
          : html`<span class="watch-tile2-name">${name}</span>`}
        ${state !== null
          ? html`<span class="watch-tile2-state" style="color: ${lit ? accent : TILE_STATE_OFF}">${formatTileState(state)}</span>`
          : nothing}
      </div>
    `;
  }

  /**
   * The state a tile shows: the entity's live state from Home Assistant, as the watch gets it from
   * the app, and "---" when HA has none. A tile on a device uses the device's first switchable
   * entity, as the app resolves it. Without hass (an editor preview) the simulator stands in.
   * Null for a tile with neither entity nor device: the watch shows its name alone.
   */
  private _tileState(tile: WatchLayoutTile): string | null {
    if (!tile.entity && !tile.device_id) return null;
    if (!this.hass) {
      if (tile.type === 'cover_state') return this._simulator.garage;
      if (tile.type === 'media_count') return this._simulator.media;
      return 'on';
    }
    const entityId = tile.entity || this._deviceEntity(tile.device_id ?? '');
    return (entityId && this.hass.states[entityId]?.state) || '---';
  }

  private _deviceEntity(deviceId: string): string | undefined {
    const entries = Object.values(this.hass?.entities ?? {}).filter((e) => e.device_id === deviceId);
    const preferred = ['light', 'switch', 'fan', 'cover', 'lock', 'input_boolean', 'media_player'];
    for (const domain of preferred) {
      const match = entries.find((e) => e.entity_id.startsWith(`${domain}.`));
      if (match) return match.entity_id;
    }
    return entries[0]?.entity_id;
  }

  private _renderLogbookScreenPreview(screen: any): TemplateResult {
    const entityCount = screen.logbook?.entityIds?.length ?? 0;
    return html`
      <div style="padding: 8px; text-align: center;">
        <div style="font-size: 28px; font-family: monospace; color: white; margin-bottom: 8px;">12:34</div>
        <div style="font-size: 10px; color: #888; margin-bottom: 8px;">LOGBOOK</div>
        <div style="font-size: 9px; color: #666; padding: 4px;">
          <div style="margin-bottom: 2px;">12:30 &nbsp; Entity turned on</div>
          <div style="margin-bottom: 2px;">12:15 &nbsp; Entity turned off</div>
          <div style="margin-bottom: 2px;">11:45 &nbsp; Entity opened</div>
        </div>
        <div style="font-size: 8px; color: #555; margin-top: 4px;">${entityCount} entities configured</div>
      </div>
    `;
  }

  /**
   * The dashboard as the watch draws it (firmware 2.4.98, "dashboard v8"; dashboard-preview.ts):
   * the date, the screen indicator and the weather on top, the time across the full width, two
   * event lines, the strip of pills with the doors verdict in slot 0, a red bar for a freezer
   * alarm, then the thermostats, the number at home, and battery, steps and heart rate. The text,
   * pills, bar and rule are an SVG of the watch's pixels, placed by baseline; the icons sit over
   * it at their boxes. The states are the entities' live states from hass, as the app sends them
   * to the watch. Battery, steps and heart rate are the watch's own, so the simulator's, as is
   * whether the watch's copy of the state has gone stale.
   */
  private _renderDashboardScreen(layout: WatchLayoutJSON, dashboard: WatchLayoutDashboard, index: number, count: number): TemplateResult {
    const states = this.hass?.states ?? {};
    const weatherId = dashboard.weather?.entity;
    const hiLo = (weatherId ? this._forecast[weatherId]?.hiLo : null) ?? legacyHiLo(weatherId ? states[weatherId] : undefined);
    const events = this._events[dashboardCalendars(dashboard, layout).join(',')]?.events ?? null;
    const sim = this._simulator;
    const p = dashboardPreview(dashboard, layout, (id) => states[id], new Date(), hiLo, { stale: sim.stale === true, events });
    const B = DASH_BASE;
    const icon = (name: string, [left, top]: readonly [number, number], extra = '', color = '') =>
      html`<ha-icon
        class="dash8-icon ${extra}"
        icon=${name}
        style="left: ${left}px; top: ${top}px${color ? `; color: ${color}` : ''}"
      ></ha-icon>`;
    return html`
      <div class="watch-dash8">
        <svg viewBox="0 0 240 240" width="240" height="240" aria-hidden="true">
          <text class="m14" x="6" y=${B.top} fill=${DASH_GREY}>${p.date}</text>
          <text class="m14" x="120" y=${B.top} text-anchor="middle" fill=${DASH_FAINT}>${index + 1}/${count}</text>
          ${p.weatherTemp !== null
            ? svg`<text class="m18" x="234" y=${B.top} text-anchor="end" fill=${DASH_WHITE}>${p.weatherTemp}°</text>`
            : nothing}
          ${p.hiLo !== null
            ? svg`<text class="m14" x="234" y=${B.hiLo} text-anchor="end" fill=${DASH_GREY}>${p.hiLo}</text>`
            : nothing}
          <text class="time" x="120" y=${B.time} text-anchor="middle" fill=${DASH_WHITE}>${p.clock}</text>
          ${p.events.map((e, i) => svg`
            <text class="m14" x="6" y=${B.event + 18 * i} fill=${e.startColor}>${e.start}</text>
            <text class="m14" x=${TITLE_X} y=${B.event + 18 * i} fill=${DASH_WHITE}>${e.title}</text>
          `)}
          ${p.pills.map((pill) => svg`
            <rect x=${pillX(pill.slot)} y=${PILL.y} width=${PILL.w} height=${PILL.h} rx=${PILL.radius} fill=${pill.fill}></rect>
            <text class="m14" x=${pillX(pill.slot) + PILL.w / 2} y=${B.pill} text-anchor="middle" fill=${DASH_INK}>${pill.letter}</text>
          `)}
          <line x1="6" y1="185.5" x2="234" y2="185.5" stroke=${DASH_RULE} stroke-width="1"></line>
          ${p.freezer !== null
            ? svg`
                <rect x="0" y="175" width="240" height="20" fill=${DASH_RED}></rect>
                <text class="bold" x="120" y=${B.freezer} text-anchor="middle" fill=${DASH_INK}>${p.freezer}</text>
              `
            : nothing}
          <text class="m18" x="6" y=${B.house} fill=${p.thermostatColor}>${p.thermostats}</text>
          ${p.home !== null ? svg`<text class="m18" x="206" y=${B.house} fill=${DASH_WHITE}>${p.home}</text>` : nothing}
          <text class="m18" x="34" y=${B.watch} fill=${DASH_WHITE}>${sim.battery}%</text>
          <text class="m18" x="116" y=${B.watch} fill=${DASH_WHITE}>${sim.steps}</text>
          <text class="m18" x="206" y=${B.watch} fill=${DASH_WHITE}>${formatHeartRate(sim.heartRate)}</text>
        </svg>
        ${p.freezer !== null
          ? html`<div
              class="dash8-freezer"
              title=${p.freezer === '!--'
                ? 'A freezer sensor has no reading'
                : 'The watch shows this once a freezer has stayed above 15 °F (-9 °C) for 20 minutes'}
            ></div>`
          : nothing}
        ${p.weatherIcon !== null ? icon(p.weatherIcon, DASH_ICON.weather, 'dash8-weather') : nothing}
        ${p.check !== null ? icon('mdi:check-bold', DASH_ICON.check, '', p.check) : nothing}
        ${icon('mdi:home', DASH_ICON.home)}
        ${icon(batteryIcon(sim.battery), DASH_ICON.battery, 'dash8-battery')}
        ${icon('mdi:shoe-print', DASH_ICON.steps)}
        ${icon('mdi:heart-pulse', DASH_ICON.heart)}
      </div>
    `;
  }

  private _renderHeader(layout: WatchLayoutJSON): TemplateResult {
    const now = new Date();
    const timeStr = layout.header.time.format === 'HH:mm'
      ? `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      : `${(now.getHours() % 12 || 12).toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Get presence color based on simulator state (for preview)
    const getPresenceColor = () => {
      switch (this._simulator.presence) {
        case 'home': return '#00C853';  // Green
        case 'away': return '#FFD600';  // Yellow
        case 'long_away': return '#FF5252';  // Red
        default: return '#9E9E9E';  // Gray
      }
    };

    return html`
      <div class="watch-header">
        <div class="watch-time align-${layout.header.time.align}">${timeStr}</div>
        <div class="presence-icons">
          ${layout.header.presence.enabled && layout.header.presence.icons.map(
            (icon) => html`
              <div class="presence-icon" style="background: ${getPresenceColor()}">
                <svg viewBox="0 0 24 24" fill="white">
                  <path d="${getGlyphPath(icon.type)}"/>
                </svg>
              </div>
            `
          )}
        </div>
      </div>
    `;
  }

  private _renderEvents(layout: WatchLayoutJSON): TemplateResult {
    // Events is now a config object, not an array
    if (!layout.events.enabled || layout.events.calendars.length === 0) {
      return html`<div class="watch-events"></div>`;
    }

    // For preview, show placeholder events based on config
    const maxEvents = layout.events.maxEvents || 2;
    const placeholderEvents = layout.events.calendars.slice(0, maxEvents).map((_, i) => ({
      time: `In ${i + 1}h`,
      title: `Event ${i + 1}`,
      isSoon: i === 0,
    }));

    return html`
      <div class="watch-events">
        ${placeholderEvents.map(
          (event) => html`
            <div class="event-row ${event.isSoon ? 'soon' : ''}">
              ${event.time}: ${event.title}
            </div>
          `
        )}
      </div>
    `;
  }

  private _renderTiles(layout: WatchLayoutJSON, _tileLayout: number = 4, screenTiles?: WatchLayoutTile[]): TemplateResult {
    // Always 2×2 grid (4 tiles max)
    const columns = 2;
    const maxTiles = 4;
    const emptyTile: WatchLayoutTile = {
      label: '',
      entity: '',
      type: 'sensor_value',
      colorMode: 'auto',
      rules: [],
      tap: 'none',
      format: { prefix: '', suffix: '', unit: '', uppercase: false },
    };

    // Use screen-specific tiles if provided, otherwise fall back to layout.tiles
    const tiles = [...(screenTiles || layout.tiles)];
    while (tiles.length < maxTiles) {
      tiles.push(emptyTile);
    }

    // Generate preview values based on tile type
    const getPreviewValue = (tile: WatchLayoutTile): string => {
      if (!tile.entity) return '-';
      switch (tile.type) {
        case 'count': return '5';
        case 'duration': return '2h';
        case 'cover_state': return this._simulator.garage === 'open' ? 'OPEN' : 'CLSD';
        case 'media_count': return this._simulator.media === 'playing' ? '\u25B6' : '\u23F9';
        case 'state_text': return 'ON';
        case 'sensor_value':
        default: return '72°';
      }
    };

    // Get color based on simulator state for preview
    const getPreviewColor = (tile: WatchLayoutTile): string => {
      if (!tile.entity) return 'transparent';
      if (tile.colorMode === 'disabled') {
        return '#FFFFFF';  // Static color for disabled mode
      }
      // Auto color based on tile type for preview
      switch (tile.type) {
        case 'cover_state':
          return this._simulator.garage === 'open' ? '#FF5252' : '#00C853';
        case 'media_count':
          return this._simulator.media === 'playing' ? '#FFD600' : '#9E9E9E';
        default:
          return '#FFFFFF';
      }
    };

    // Get label display: text or icon glyph
    const getLabelDisplay = (tile: WatchLayoutTile): string => {
      if (tile.displayMode === 1 && tile.icon) {
        // Icon mode — show icon name as placeholder (actual glyph on watch)
        return `[${tile.icon}]`;
      }
      return tile.label || '';
    };

    return html`
      <div class="watch-tiles" style="grid-template-columns: repeat(${columns}, 1fr);">
        ${tiles.slice(0, maxTiles).map(
          (tile) => html`
            <div class="watch-tile">
              <span class="tile-label">${getLabelDisplay(tile)}</span>
              <span class="tile-value" style="color: ${getPreviewColor(tile)}">${getPreviewValue(tile)}</span>
            </div>
          `
        )}
      </div>
    `;
  }

  private _renderActions(layout: WatchLayoutJSON, screenActions?: WatchLayoutAction[]): TemplateResult {
    const actions = screenActions ?? layout.actions ?? [];
    if (actions.length === 0) {
      return html`<div class="watch-actions"></div>`;
    }

    // Get preview color for action based on its config and simulator state
    const getActionColor = (action: WatchLayoutAction): string => {
      if (!action.stateColor) return '#FFFFFF';
      // For preview, derive color from action type and simulator
      if (action.actionType.startsWith('cover.')) {
        return this._simulator.garage === 'open' ? '#FF5252' : '#00C853';
      }
      if (action.actionType === 'media.play_pause') {
        return this._simulator.media === 'playing' ? '#FFD600' : '#9E9E9E';
      }
      return '#FFFFFF';
    };

    return html`
      <div class="watch-actions">
        ${actions.map(
          (action) => html`
            <div class="watch-action" style="color: ${getActionColor(action)}">
              ${action.icon ? html`
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="${getGlyphPath(action.icon)}"/>
                </svg>
              ` : nothing}
              <span>${action.label}</span>
            </div>
          `
        )}
      </div>
    `;
  }

  private _renderStatusBar(layout: WatchLayoutJSON): TemplateResult {
    const { statusBar } = layout;

    // Use simulator values for preview
    const batteryColor = this._simulator.battery < 15 ? '#FF5252' :
                         this._simulator.battery < 30 ? '#FFD600' : '#FFFFFF';
    const bluetoothColor = this._simulator.bluetooth ? '#18A1FF' : '#9E9E9E';
    const notificationsColor = this._simulator.notifications > 0 ? '#18A1FF' : '#9E9E9E';

    return html`
      <div class="watch-status-bar">
        ${statusBar.battery?.enabled ? html`
          <div class="status-item" style="color: ${batteryColor}">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="${getGlyphPath('battery')}"/>
            </svg>
            <span>${this._simulator.battery}%</span>
          </div>
        ` : nothing}

        ${statusBar.steps?.enabled ? html`
          <div class="status-item" style="color: var(--color-white)">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="${getGlyphPath('steps')}"/>
            </svg>
            <span>5,234</span>
          </div>
        ` : nothing}

        ${statusBar.heartRate?.enabled ? html`
          <div class="status-item" style="color: var(--color-red)">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="${getGlyphPath('heart')}"/>
            </svg>
            <span>72</span>
          </div>
        ` : nothing}

        ${statusBar.notifications?.enabled ? html`
          <div class="status-item" style="color: ${notificationsColor}">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="${getGlyphPath('bell')}"/>
            </svg>
            <span>${this._simulator.notifications}</span>
          </div>
        ` : nothing}

        ${statusBar.bluetooth?.enabled ? html`
          <div class="status-item" style="color: ${bluetoothColor}">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="${getGlyphPath('bluetooth')}"/>
            </svg>
          </div>
        ` : nothing}
      </div>
    `;
  }

  private _renderJsonOutput(): TemplateResult {
    const json = this._watchLayout
      ? JSON.stringify(this._watchLayout, null, 2)
      : '{}';

    return html`
      <div class="json-output" role="region" aria-label="Watch layout JSON output">${json}</div>
    `;
  }

  private _renderSimulator(): TemplateResult {
    return html`
      <div class="simulator-panel">
        <div class="simulator-title">State Simulator</div>
        <div class="simulator-controls">
          <div class="simulator-control">
            <label for="sim-garage">Garage</label>
            <select
              id="sim-garage"
              aria-label="Simulate garage state"
              .value=${this._simulator.garage}
              @change=${(e: Event) => {
                this._simulator = { ...this._simulator, garage: (e.target as HTMLSelectElement).value as any };
                this._updateLayout();
              }}
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div class="simulator-control">
            <label for="sim-media">Media</label>
            <select
              id="sim-media"
              aria-label="Simulate media state"
              .value=${this._simulator.media}
              @change=${(e: Event) => {
                this._simulator = { ...this._simulator, media: (e.target as HTMLSelectElement).value as any };
                this._updateLayout();
              }}
            >
              <option value="playing">Playing</option>
              <option value="paused">Paused</option>
              <option value="idle">Idle</option>
            </select>
          </div>

          <div class="simulator-control">
            <label for="sim-presence">Presence</label>
            <select
              id="sim-presence"
              aria-label="Simulate presence state"
              .value=${this._simulator.presence}
              @change=${(e: Event) => {
                this._simulator = { ...this._simulator, presence: (e.target as HTMLSelectElement).value as any };
                this._updateLayout();
              }}
            >
              <option value="home">Home</option>
              <option value="away">Away</option>
              <option value="long_away">Long Away</option>
            </select>
          </div>

          <div class="simulator-control">
            <label for="sim-notifications">Notifications</label>
            <input
              id="sim-notifications"
              aria-label="Simulate notification count"
              type="number"
              min="0"
              max="99"
              .value=${this._simulator.notifications.toString()}
              @input=${(e: Event) => {
                this._simulator = { ...this._simulator, notifications: parseInt((e.target as HTMLInputElement).value) || 0 };
                this._updateLayout();
              }}
            />
          </div>

          <div class="simulator-control">
            <label for="sim-bluetooth">Bluetooth</label>
            <select
              id="sim-bluetooth"
              aria-label="Simulate bluetooth state"
              .value=${this._simulator.bluetooth ? 'connected' : 'disconnected'}
              @change=${(e: Event) => {
                this._simulator = { ...this._simulator, bluetooth: (e.target as HTMLSelectElement).value === 'connected' };
                this._updateLayout();
              }}
            >
              <option value="connected">Connected</option>
              <option value="disconnected">Disconnected</option>
            </select>
          </div>

          <div class="simulator-control">
            <label for="sim-battery">Battery %</label>
            <input
              id="sim-battery"
              aria-label="Simulate battery percentage"
              type="range"
              min="0"
              max="100"
              .value=${this._simulator.battery.toString()}
              @input=${(e: Event) => {
                this._simulator = { ...this._simulator, battery: parseInt((e.target as HTMLInputElement).value) };
                this._updateLayout();
              }}
            />
            <span>${this._simulator.battery}%</span>
          </div>

          <div class="simulator-control">
            <label for="sim-stale">Dashboard state</label>
            <select
              id="sim-stale"
              aria-label="Simulate how old the watch's dashboard state is"
              .value=${this._simulator.stale ? 'stale' : 'fresh'}
              @change=${(e: Event) => {
                this._simulator = { ...this._simulator, stale: (e.target as HTMLSelectElement).value === 'stale' };
              }}
            >
              <option value="fresh">Fresh</option>
              <option value="stale">Over 30 min old</option>
            </select>
          </div>
        </div>
      </div>
    `;
  }
}

// Register the card with Home Assistant
declare global {
  interface HTMLElementTagNameMap {
    [CARD_TAG]: InfinassistantWatchfaceCard;
  }
  interface Window {
    customCards?: Array<{
      type: string;
      name: string;
      description: string;
      preview?: boolean;
    }>;
    __infinassistantWatchface?: LoadedCopies;
  }
}

// Register with Home Assistant custom card registry, once however many copies load
window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'custom:' + CARD_TAG)) {
  window.customCards.push({
    type: 'custom:' + CARD_TAG,
    name: 'InfinAssistant Watch Face',
    description: 'Configure and preview your InfiniTime watch face layout',
    preview: false, // Disable preview to avoid scoped registry timing issues
  });
}
