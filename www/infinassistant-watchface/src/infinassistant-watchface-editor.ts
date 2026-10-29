/**
 * InfinAssistant Watch Face Editor
 *
 * Visual editor component with tabbed UI for configuring the watch face.
 * Includes live preview, validation, and state simulator.
 *
 * ---- ARIA ACCESSIBILITY ASSESSMENT ----
 *
 * ALREADY IMPLEMENTED:
 * - Tab navigation: role="tablist", role="tab", aria-selected, aria-controls,
 *   tabindex roving, full keyboard nav (Arrow keys, Home, End)
 * - Tab content panel: role="tabpanel" with aria-label
 * - Validation messages: role="status" / role="alert"
 * - Entity dropdown: role="listbox", role="option", aria-selected
 * - Icon picker: aria-expanded, aria-haspopup, aria-label, aria-pressed
 * - Screen list items: role="button", aria-label, aria-pressed, @keydown
 * - Tile grid items: role="button", aria-label, aria-pressed, @keydown
 * - Remove/move buttons: aria-label on all destructive actions
 * - Drag handles: aria-hidden="true"
 * - Error banners: role="alert"
 *
 * REMAINING WORK (estimated ~56 form fields, MEDIUM-LARGE effort):
 * 1. <label> elements (56 instances) lack programmatic association with their
 *    inputs. None use `for`/`id` pairs or wrap their `<input>`/`<select>`.
 *    Fix: Either wrap inputs inside <label>, or add matching `for`/`id` attrs.
 * 2. Checkbox toggle rows (~10 instances) use `<span class="toggle-label">`
 *    instead of `<label>`. These are not associated with their checkbox inputs.
 *    Fix: Replace <span> with <label for="..."> or wrap the checkbox.
 * 3. Color inputs (~4 instances) have adjacent <label> text but no programmatic
 *    link. Screen readers may not announce the label when focusing the input.
 * 4. Entity search inputs in _renderSearchableEntitySelect lack aria-autocomplete
 *    and aria-activedescendant for the dropdown suggestion pattern.
 * 5. Logbook card picker toggle button has aria-expanded but the expanded
 *    region lacks aria-controls pointing to the picker list container.
 * 6. Form sections use <div class="form-section-title"> instead of <fieldset>
 *    and <legend>. Screen readers cannot group related controls.
 *
 * PRIORITY: Items 1-2 (label association) would provide the most impact for
 * screen reader users. Items 4-6 are progressive enhancements.
 * ---- END ARIA ASSESSMENT ----
 */

import { LitElement, html, nothing, type TemplateResult, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import type {
  CardConfig,
  HomeAssistant,
  LovelaceCardEditor,
  EditorTab,
  TileConfig,
  ActionConfig,
  PresenceIconConfig,
  SimulatorState,
  WatchLayoutJSON,
  ValidationResult,
  DiscoveredLogbookCard,
} from './types';
import {
  DEFAULT_CONFIG,
  DEFAULT_TILE_CONFIG,
  DEFAULT_ACTION_CONFIG,
  EDITOR_TABS,
  EDITOR_TAG,
  MAX_TILES,
  MAX_ACTIONS,
  MAX_PRESENCE_ICONS,
  MAX_SCREENS,
} from './constants';
import { validateConfig, getTabBadgeCounts } from './validator';
import { exportWatchLayout, estimatePayloadSize, glyphSymbolProblem } from './watch-layout-exporter';
import {
  getPresenceGlyphOptions,
  getEntityGlyphOptions,
} from './glyph-registry';
import { sharedStyles, previewStyles, editorStyles } from './styles';

const TABS = EDITOR_TABS;

// Use conditional registration to avoid "already defined" errors on hot reload
const defineEditor = (tagName: string) => {
  return (classOrDescriptor: typeof LitElement) => {
    if (!customElements.get(tagName)) {
      customElements.define(tagName, classOrDescriptor);
    }
    return classOrDescriptor;
  };
};

@defineEditor(EDITOR_TAG)
export class InfinassistantWatchfaceEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) hass?: HomeAssistant;
  @property({ attribute: false }) lovelace?: { config: unknown };

  @state() private _config: CardConfig = DEFAULT_CONFIG;
  @state() private _activeTab: EditorTab = 'settings';
  @state() private _selectedTileIndex: number = -1;
  @state() private _selectedScreenIndex: number = 0;
  @state() private _selectedScreenTileIndex: number = -1;
  @state() private _validation: ValidationResult | null = null;
  @state() private _watchLayout: WatchLayoutJSON | null = null;

  @state() private _simulator: SimulatorState = {
    garage: 'closed',
    media: 'idle',
    presence: 'home',
    notifications: 0,
    bluetooth: true,
    battery: 75,
  };

  // Event listener cleanup tracking
  private _unsubscribers: Array<() => void> = [];

  static styles = [sharedStyles, previewStyles, editorStyles];

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribers.forEach(unsub => unsub());
    this._unsubscribers = [];
  }

  setConfig(config: Partial<CardConfig>): void {
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
      screens: config.screens || [],
      logbook_app: config.logbook_app ? { ...config.logbook_app } : undefined,
      home_control: config.home_control ? {
        devices: [...(config.home_control.devices || [])],
      } : undefined,
    } as CardConfig;

    // Migrate: if header.presence is configured but no dashboard screen has presence yet,
    // copy header.presence into the first dashboard screen so it appears in the new location.
    const headerPresence = config.header?.presence;
    if (headerPresence && headerPresence.enabled && this._config.screens) {
      const firstDashIdx = this._config.screens.findIndex(s => s.screenType === 'dashboard');
      if (firstDashIdx >= 0 && !this._config.screens[firstDashIdx].dashboard?.presence) {
        const screens = [...this._config.screens];
        const s = screens[firstDashIdx];
        screens[firstDashIdx] = {
          ...s,
          dashboard: {
            ...(s.dashboard || { statusGroups: [], sensorGroups: [] }),
            presence: { ...headerPresence, icons: [...(headerPresence.icons || [])] },
          },
        };
        this._config = { ...this._config, screens };
      }
    }

    this._updateValidation();
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (changedProps.has('hass')) {
      this._updateValidation();
    }
  }

  private _updateValidation(): void {
    this._validation = validateConfig(this._config, this.hass);
    // Export config-only layout (no state data)
    this._watchLayout = exportWatchLayout(this._config);
  }

  private _fireConfigChanged(): void {
    this._updateValidation();
    const event = new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  private _updateConfig<K extends keyof CardConfig>(key: K, value: CardConfig[K]): void {
    this._config = { ...this._config, [key]: value };
    this._fireConfigChanged();
  }

  private _getEntities(...domains: string[]): string[] {
    if (!this.hass) return [];
    const entities = Object.keys(this.hass.states);
    if (domains.length === 0) {
      return entities;
    }
    return entities.filter(e => domains.some(domain => e.startsWith(domain + '.')));
  }

  private _getEntitiesByDevice(deviceId: string): string[] {
    if (!this.hass || !deviceId) return [];
    const entities = Object.values(this.hass.states);
    return entities
      .filter(entity => {
        const attrs = entity.attributes as any;
        return attrs.device_id === deviceId;
      })
      .map(entity => entity.entity_id);
  }

  private _filterEntities(entities: string[], searchText: string, deviceId?: string): string[] {
    let filtered = entities;

    // Filter by device if specified
    if (deviceId) {
      const deviceEntities = this._getEntitiesByDevice(deviceId);
      filtered = filtered.filter(e => deviceEntities.includes(e));
    }

    // Filter by search text (substring match)
    if (searchText && searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(e => {
        const entityName = e.toLowerCase();
        const friendlyName = (this.hass?.states[e]?.attributes as any)?.friendly_name?.toLowerCase() || '';
        return entityName.includes(search) || friendlyName.includes(search);
      });
    }

    return filtered;
  }

  private _renderSearchableEntitySelect(
    filterId: string,
    currentValue: string,
    domains: string[],
    onChange: (value: string) => void,
    placeholder: string = 'Select entity...'
  ): TemplateResult {
    const searchText = this._searchFilters[filterId] || '';
    const deviceFilter = this._deviceFilters[filterId] || '';
    const allEntities = this._getEntities(...domains);
    const filteredEntities = this._filterEntities(allEntities, searchText, deviceFilter);
    const showDropdown = searchText.length > 0 || deviceFilter.length > 0;

    return html`
      <div class="searchable-select">
        <input
          type="text"
          .value=${currentValue}
          @input=${(e: Event) => {
            const value = (e.target as HTMLInputElement).value;
            this._searchFilters = { ...this._searchFilters, [filterId]: value };
            this.requestUpdate();
          }}
          @focus=${() => {
            if (!this._searchFilters[filterId]) {
              this._searchFilters = { ...this._searchFilters, [filterId]: '' };
              this.requestUpdate();
            }
          }}
          placeholder=${placeholder}
          autocomplete="off"
        />
        ${showDropdown && filteredEntities.length > 0
          ? html`
              <div class="entity-dropdown" role="listbox" aria-label="Entity suggestions">
                ${filteredEntities.slice(0, 50).map(
                  (entity) => {
                    const friendlyName = (this.hass?.states[entity]?.attributes as any)?.friendly_name || entity;
                    return html`
                      <div
                        class="entity-option ${entity === currentValue ? 'selected' : ''}"
                        role="option"
                        tabindex="0"
                        aria-selected=${entity === currentValue}
                        @click=${() => {
                          onChange(entity);
                          this._searchFilters = { ...this._searchFilters, [filterId]: '' };
                          this.requestUpdate();
                        }}
                        @keydown=${(e: KeyboardEvent) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onChange(entity);
                            this._searchFilters = { ...this._searchFilters, [filterId]: '' };
                            this.requestUpdate();
                          }
                        }}
                      >
                        <span class="entity-name">${entity}</span>
                        <span class="entity-friendly">${friendlyName}</span>
                      </div>
                    `;
                  }
                )}
                ${filteredEntities.length > 50
                  ? html`<div class="entity-option-info">Showing first 50 of ${filteredEntities.length} results. Refine your search.</div>`
                  : nothing}
              </div>
            `
          : showDropdown
          ? html`<div class="entity-dropdown"><div class="entity-option-info">No entities found</div></div>`
          : nothing}
      </div>
    `;
  }

  private _renderDeviceFilter(filterId: string): TemplateResult {
    if (this._devices.length === 0) {
      this._loadDevices();
    }

    const currentDevice = this._deviceFilters[filterId] || '';

    return html`
      <div class="device-filter">
        <label style="font-size: 11px; color: var(--secondary-text-color);">Filter by device:</label>
        <select
          .value=${currentDevice}
          @change=${(e: Event) => {
            const value = (e.target as HTMLSelectElement).value;
            this._deviceFilters = { ...this._deviceFilters, [filterId]: value };
            this.requestUpdate();
          }}
          style="font-size: 12px; padding: 4px;"
        >
          <option value="">All devices</option>
          ${this._devices.map(
            (device) => html`
              <option value="${device.id}">${device.name}</option>
            `
          )}
        </select>
      </div>
    `;
  }

  private _renderIconPicker(
    filterId: string,
    currentValue: string,
    onSelect: (icon: string) => void
  ): TemplateResult {
    const isOpen = this._activeIconPicker === filterId;

    return html`
      <div class="icon-picker-container">
        <button
          class="icon-picker-button"
          @click=${() => {
            this._activeIconPicker = isOpen ? null : filterId;
            this.requestUpdate();
          }}
          title="Pick an icon"
          aria-label="Pick an icon"
          aria-expanded=${isOpen}
          aria-haspopup="dialog"
        >
          ${currentValue || '\uD83D\uDCDD'}
        </button>
        ${isOpen
          ? html`
              <div class="icon-picker-dropdown">
                <div class="icon-picker-header">
                  <span>Select Icon</span>
                  <button
                    class="icon-picker-close"
                    aria-label="Close icon picker"
                    @click=${() => {
                      this._activeIconPicker = null;
                      this.requestUpdate();
                    }}
                  >
                    \u2715
                  </button>
                </div>
                <div class="icon-picker-content">
                  ${Object.entries(this.AVAILABLE_ICONS).map(
                    ([category, icons]) => html`
                      <div class="icon-category">
                        <div class="icon-category-label">${category}</div>
                        <div class="icon-grid">
                          ${icons.map(
                            (icon) => html`
                              <button
                                class="icon-option ${icon === currentValue ? 'selected' : ''}"
                                @click=${() => {
                                  onSelect(icon);
                                  this._activeIconPicker = null;
                                  this.requestUpdate();
                                }}
                                title=${icon}
                                aria-label="Select icon ${icon}"
                                aria-pressed=${icon === currentValue}
                              >
                                ${icon}
                              </button>
                            `
                          )}
                        </div>
                      </div>
                    `
                  )}
                </div>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  @state() private _searchFilters: Record<string, string> = {}; // Track search text for each dropdown
  @state() private _deviceFilters: Record<string, string> = {}; // Track device filter for entity sections
  @state() private _devices: Array<{ id: string; name: string }> = [];
  @state() private _deviceActions: Record<string, Array<{ type: string; subtype?: string; description?: string }>> = {};
  @state() private _infinassistantDevices: Array<{ device_id: string; name: string }> = [];
  @state() private _activeIconPicker: string | null = null; // Track which icon picker is open (filterId)
  @state() private _isLoadingDevices: boolean = false; // Guard against concurrent device loads
  @state() private _isLoadingInfinassistantDevices: boolean = false; // Guard against concurrent InfinAssistant device loads
  @state() private _loadError: string | null = null; // Error message from async operations

  // Logbook card discovery state
  @state() private _discoveredLogbookCards: DiscoveredLogbookCard[] = [];
  @state() private _isLoadingLogbookCards = false;
  @state() private _showLogbookCardPicker = false;
  @state() private _logbookImportMessage: string | null = null;
  @state() private _searchAllDashboards = false;

  // Available icons organized by category
  private readonly AVAILABLE_ICONS = {
    'Doors & Windows': ['🚪', '🪟', '🔒', '🔓', '🔐'],
    'Garage & Vehicles': ['🚗', '🚙', '🚕', '🚐', '🏍️', '🚲', '🛻'],
    'People': ['👤', '👥', '🚶', '🚶‍♂️', '🚶‍♀️', '👨', '👩', '👶'],
    'Home & Rooms': ['🏠', '🏡', '🛏️', '🛋️', '🚿', '🧺'],
    'Motion & Security': ['👁️', '📹', '🔔', '🚨', '⚠️'],
    'Lights': ['💡', '🔆', '🔅', '🕯️', '💡'],
    'Media': ['🔊', '📺', '📻', '🎵', '🎶', '🎙️', '📢'],
    'Climate': ['🌡️', '❄️', '🔥', '💨', '💧', '☀️', '🌙'],
    'Appliances': ['🔌', '⚡', '🔋', '📱', '💻', '⌚'],
    'Status': ['✓', '✗', '●', '○', '▪', '▫', '✦', '★'],
    'Letters': ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
  };

  private async _loadDevices(): Promise<void> {
    if (!this.hass) return;
    // Guard against concurrent loads (L4 fix)
    if (this._isLoadingDevices) return;
    this._isLoadingDevices = true;

    try {
      // Use WebSocket API to fetch device registry
      const conn = (this.hass as any).connection;
      if (!conn) {
        this._isLoadingDevices = false;
        return;
      }

      const result = await conn.sendMessagePromise({
        type: 'config/device_registry/list',
      });

      if (result && Array.isArray(result)) {
        this._devices = result
          .filter((d: any) => !d.disabled_by)
          .map((d: any) => ({
            id: d.id,
            name: d.name_by_user || d.name || d.id,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
      }
      // Clear any previous error on success
      this._loadError = null;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load devices';
      console.warn('Failed to load devices:', err);
      // Set error state for UI feedback (L3 fix)
      this._loadError = errorMsg;
    } finally {
      this._isLoadingDevices = false;
    }
  }

  private async _loadInfinassistantDevices(): Promise<void> {
    if (!this.hass) return;
    // Guard against concurrent loads (L4 fix)
    if (this._isLoadingInfinassistantDevices) return;
    this._isLoadingInfinassistantDevices = true;

    try {
      const conn = (this.hass as any).connection;
      if (!conn) {
        this._isLoadingInfinassistantDevices = false;
        return;
      }

      // Get devices from device registry - this includes the device identifiers
      const devices = await conn.sendMessagePromise({
        type: 'config/device_registry/list',
      });

      const infinassistantDevices: Array<{ device_id: string; name: string }> = [];

      if (devices && Array.isArray(devices)) {
        for (const device of devices) {
          // Check if this device has an infinassistant identifier
          // Identifiers are arrays of [domain, id] tuples
          const identifiers = device.identifiers || [];
          for (const [domain, deviceId] of identifiers) {
            if (domain === 'infinassistant') {
              const name = device.name || device.name_by_user || deviceId;
              infinassistantDevices.push({ device_id: deviceId, name });
              break; // Found the infinassistant identifier, move to next device
            }
          }
        }
      }

      this._infinassistantDevices = infinassistantDevices;

      // Auto-select if only one device and no device_id set
      if (infinassistantDevices.length === 1 && !this._config.device_id) {
        this._updateConfig('device_id', infinassistantDevices[0].device_id);
      }
      // Clear any previous error on success
      this._loadError = null;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load InfinAssistant devices';
      console.warn('Failed to load InfinAssistant devices:', err);
      // Set error state for UI feedback (L3 fix)
      this._loadError = errorMsg;
    } finally {
      this._isLoadingInfinassistantDevices = false;
    }
  }

  private async _loadDeviceActions(deviceId: string): Promise<void> {
    if (!this.hass || !deviceId) return;
    try {
      // Use WebSocket API to fetch device actions
      const conn = (this.hass as any).connection;
      if (!conn) return;

      const result = await conn.sendMessagePromise({
        type: 'device_automation/action/list',
        device_id: deviceId,
      });

      if (result && Array.isArray(result)) {
        this._deviceActions[deviceId] = result.map((da: any) => ({
          type: da.type,
          subtype: da.subtype,
          description: da.metadata?.name || (da.type + (da.subtype ? ' - ' + da.subtype : '')),
        }));
      }
    } catch (err) {
      console.warn('Failed to load device actions:', err);
    }
  }

  private _extractLogbookCardsFromConfig(
    config: any,
    dashboardTitle: string
  ): DiscoveredLogbookCard[] {
    const results: DiscoveredLogbookCard[] = [];
    if (!config || !Array.isArray(config.views)) return results;

    for (const view of config.views) {
      const viewTitle = view.title || view.path || 'Untitled view';
      const cards = view.cards || [];
      this._findLogbookCards(cards, dashboardTitle, viewTitle, results);
    }
    return results;
  }

  private _findLogbookCards(
    cards: any[],
    dashboardTitle: string,
    viewTitle: string,
    results: DiscoveredLogbookCard[]
  ): void {
    for (const card of cards) {
      if (!card) continue;
      // Check if this card is a logbook/activity card
      if (card.type === 'logbook') {
        const entities: string[] = [];

        // Current format: target.entity_id (array or single string)
        const targetEntities = card.target?.entity_id;
        if (Array.isArray(targetEntities)) {
          entities.push(...targetEntities.filter((e: any) => typeof e === 'string' && e.length > 0));
        } else if (typeof targetEntities === 'string' && targetEntities.length > 0) {
          entities.push(targetEntities);
        }

        // Legacy format: entities (array of strings or { entity: "..." })
        if (entities.length === 0 && Array.isArray(card.entities)) {
          for (const e of card.entities) {
            const id = typeof e === 'string' ? e : e?.entity;
            if (typeof id === 'string' && id.length > 0) entities.push(id);
          }
        }

        if (entities.length > 0) {
          results.push({
            title: card.title || 'Logbook',
            entities,
            dashboardTitle,
            viewTitle,
          });
        }
      }
      // Recurse into nested containers (stacks, grids, conditionals)
      if (Array.isArray(card.cards)) {
        this._findLogbookCards(card.cards, dashboardTitle, viewTitle, results);
      }
      if (Array.isArray(card.card?.cards)) {
        this._findLogbookCards(card.card.cards, dashboardTitle, viewTitle, results);
      }
      // conditional card wraps a single card
      if (card.card && card.card.type) {
        this._findLogbookCards([card.card], dashboardTitle, viewTitle, results);
      }
    }
  }

  private async _loadLogbookCards(): Promise<void> {
    if (this._isLoadingLogbookCards) return;
    this._isLoadingLogbookCards = true;
    this._discoveredLogbookCards = [];
    this._logbookImportMessage = null;

    try {
      const allCards: DiscoveredLogbookCard[] = [];

      // First check local lovelace config (synchronous, zero API calls)
      if (this.lovelace?.config) {
        const local = this._extractLogbookCardsFromConfig(
          this.lovelace.config,
          'Current dashboard'
        );
        allCards.push(...local);
      }

      // If searching all dashboards or no local results, fetch via WS
      if (this._searchAllDashboards || allCards.length === 0) {
        const conn = (this.hass as any)?.connection;
        if (conn) {
          try {
            // Fetch default dashboard config
            const defaultConfig = await conn.sendMessagePromise({
              type: 'lovelace/config',
            });
            if (defaultConfig) {
              const cards = this._extractLogbookCardsFromConfig(defaultConfig, 'Overview');
              allCards.push(...cards);
            }
          } catch {
            // Default dashboard may not exist or lack permissions
          }

          try {
            // Fetch list of custom dashboards
            const dashboards = await conn.sendMessagePromise({
              type: 'lovelace/dashboards',
            });

            if (Array.isArray(dashboards)) {
              for (const db of dashboards) {
                if (!db.url_path) continue;
                try {
                  const dbConfig = await conn.sendMessagePromise({
                    type: 'lovelace/config',
                    url_path: db.url_path,
                  });
                  if (dbConfig) {
                    const title = db.title || db.url_path;
                    const cards = this._extractLogbookCardsFromConfig(dbConfig, title);
                    allCards.push(...cards);
                  }
                } catch {
                  // Skip dashboards that fail (permissions, etc.)
                }
              }
            }
          } catch {
            // Dashboards API unavailable
          }
        }
      }

      // Deduplicate by entity set
      const seen = new Set<string>();
      const deduped: DiscoveredLogbookCard[] = [];
      for (const card of allCards) {
        const key = [...card.entities].sort().join('|');
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(card);
        }
      }

      this._discoveredLogbookCards = deduped;
    } catch (err) {
      console.warn('Failed to discover logbook cards:', err);
    } finally {
      this._isLoadingLogbookCards = false;
    }
  }

  private _importLogbookEntities(card: DiscoveredLogbookCard, screenIndex: number): void {
    const screens = this._config.screens || [];
    const screen = screens[screenIndex];
    if (!screen) return;

    const logbook = screen.logbook || { entityIds: [], maxEntries: 15, hoursBack: 12 };
    const existing = new Set(logbook.entityIds);
    const maxEntities = 10;

    let added = 0;
    let duplicates = 0;
    let skipped = 0;
    const newIds = [...logbook.entityIds];

    for (const entityId of card.entities) {
      if (existing.has(entityId)) {
        duplicates++;
        continue;
      }
      if (newIds.length >= maxEntities) {
        skipped++;
        continue;
      }
      newIds.push(entityId);
      existing.add(entityId);
      added++;
    }

    this._updateScreenLogbook(screenIndex, { ...logbook, entityIds: newIds });

    // Build feedback message
    const parts: string[] = [];
    if (added > 0) parts.push(`Added ${added} ${added === 1 ? 'entity' : 'entities'}`);
    if (duplicates > 0) parts.push(`${duplicates} already existed`);
    if (skipped > 0) parts.push(`${skipped} skipped (limit of ${maxEntities})`);
    this._logbookImportMessage = parts.join(', ') || 'No entities to add';

    this._showLogbookCardPicker = false;
  }

  private _renderEntityInput(
    value: string,
    onChange: (value: string) => void,
    domain?: string,
    placeholder?: string
  ): TemplateResult {
    const entities = this._getEntities(domain ?? '');
    const datalistId = `entities-${domain || 'all'}-${Math.random().toString(36).substr(2, 9)}`;

    return html`
      <input
        type="text"
        .value=${value}
        @input=${(e: Event) => onChange((e.target as HTMLInputElement).value)}
        list=${datalistId}
        placeholder=${placeholder || 'Select entity...'}
        autocomplete="off"
      />
      <datalist id=${datalistId}>
        ${entities.map(entity => html`<option value=${entity}></option>`)}
      </datalist>
    `;
  }

  protected render(): TemplateResult {
    const tabBadges = this._validation ? getTabBadgeCounts(this._validation) : null;

    return html`
      <div class="editor-container">
        ${this._loadError ? this._renderLoadError() : nothing}
        ${this._renderTabs(tabBadges)}
        <div class="tab-content" role="tabpanel" aria-label="${this._activeTab} settings">
          ${this._renderActiveTab()}
        </div>
        ${this._renderTabValidation()}
      </div>
    `;
  }

  private _renderLoadError(): TemplateResult {
    return html`
      <div class="load-error-banner" role="alert">
        <span class="error-icon">\u274C</span>
        <span class="error-message">${this._loadError}</span>
        <button
          class="retry-button"
          aria-label="Retry loading devices"
          @click=${() => {
            this._loadError = null;
            this._loadDevices();
            this._loadInfinassistantDevices();
          }}
        >
          Retry
        </button>
      </div>
    `;
  }

  private _renderTabs(
    badges: ReturnType<typeof getTabBadgeCounts> | null
  ): TemplateResult {
    return html`
      <div class="tabs-header" role="tablist" aria-label="Editor sections">
        ${TABS.map(
          (tab) => html`
            <button
              class="tab-button ${this._activeTab === tab.id ? 'active' : ''}"
              role="tab"
              aria-selected=${this._activeTab === tab.id}
              aria-controls="tab-content"
              tabindex=${this._activeTab === tab.id ? '0' : '-1'}
              @click=${() => (this._activeTab = tab.id)}
              @keydown=${(e: KeyboardEvent) => {
                const tabIds = TABS.map(t => t.id);
                const currentIndex = tabIds.indexOf(this._activeTab);
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                  e.preventDefault();
                  const nextIndex = (currentIndex + 1) % tabIds.length;
                  this._activeTab = tabIds[nextIndex];
                  (this.shadowRoot?.querySelector(`[role="tab"][aria-selected="true"]`) as HTMLElement)?.focus();
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  const prevIndex = (currentIndex - 1 + tabIds.length) % tabIds.length;
                  this._activeTab = tabIds[prevIndex];
                  (this.shadowRoot?.querySelector(`[role="tab"][aria-selected="true"]`) as HTMLElement)?.focus();
                } else if (e.key === 'Home') {
                  e.preventDefault();
                  this._activeTab = tabIds[0];
                  (this.shadowRoot?.querySelector(`[role="tab"][aria-selected="true"]`) as HTMLElement)?.focus();
                } else if (e.key === 'End') {
                  e.preventDefault();
                  this._activeTab = tabIds[tabIds.length - 1];
                  (this.shadowRoot?.querySelector(`[role="tab"][aria-selected="true"]`) as HTMLElement)?.focus();
                }
              }}
            >
              ${tab.label}
              ${badges && badges[tab.id] && badges[tab.id].errors > 0
                ? html`<span class="tab-badge error">${badges[tab.id].errors}</span>`
                : badges && badges[tab.id] && badges[tab.id].warnings > 0
                ? html`<span class="tab-badge warning">${badges[tab.id].warnings}</span>`
                : nothing}
            </button>
          `
        )}
      </div>
    `;
  }

  private _renderActiveTab(): TemplateResult {
    switch (this._activeTab) {
      case 'settings':     return this._renderSettingsTab();
      case 'screens':      return this._renderScreensTab();
      case 'calendar':     return this._renderEventsTab();
      case 'logbook':      return this._renderLogbookTab();
      case 'home_control': return this._renderHomeControlTab();
      default:             return html`<p>Select a tab</p>`;
    }
  }

  private _renderTabValidation(): TemplateResult {
    if (!this._validation) return html``;

    const messages = this._validation.byTab[this._activeTab] || [];
    if (messages.length === 0) return html``;

    return html`
      <div class="validation-messages" role="status" aria-label="Validation messages for ${this._activeTab} tab">
        ${messages.map(
          (msg) => html`
            <div class="validation-message ${msg.severity}" role="${msg.severity === 'error' ? 'alert' : 'status'}">
              ${msg.severity === 'error' ? '\u274C' : msg.severity === 'warning' ? '\u26A0\uFE0F' : '\u2139\uFE0F'}
              ${msg.message}
            </div>
          `
        )}
      </div>
    `;
  }

  // ========== SETTINGS TAB (merged: Layout + Header + Status Bar + Advanced) ==========
  private _renderSettingsTab(): TemplateResult {
    // Load InfinAssistant devices on first render if not loaded
    if (this._infinassistantDevices.length === 0) {
      this._loadInfinassistantDevices();
    }

    return html`
      <div class="form-section">
        <div class="form-section-title">General</div>
        <div class="form-row">
          <div class="form-field">
            <label>Face Name</label>
            <input
              type="text"
              .value=${this._config.name || ''}
              @input=${(e: Event) =>
                this._updateConfig('name', (e.target as HTMLInputElement).value)}
              placeholder="InfinAssistant"
            />
          </div>
          <div class="form-field">
            <label>Watch Device</label>
            ${this._infinassistantDevices.length > 0
              ? html`
                  <select
                    @change=${(e: Event) => {
                      const value = (e.target as HTMLSelectElement).value;
                      this._updateConfig('device_id', value);
                    }}
                  >
                    <option value="" ?selected=${!this._config.device_id}>Select a watch...</option>
                    ${this._infinassistantDevices.map(
                      (device) => html`
                        <option value="${device.device_id}" ?selected=${this._config.device_id === device.device_id}>${device.name}</option>
                      `
                    )}
                  </select>
                  <p style="font-size: 11px; color: var(--secondary-text-color); margin: 4px 0 0;">
                    Select your PineTime watch to enable "Push to Watch"
                  </p>
                `
              : html`
                  <input
                    type="text"
                    .value=${this._config.device_id || ''}
                    @input=${(e: Event) =>
                      this._updateConfig('device_id', (e.target as HTMLInputElement).value)}
                    placeholder="my_pinetime"
                  />
                  <p style="font-size: 11px; color: var(--warning-color, orange); margin: 4px 0 0;">
                    No InfinAssistant watches found. Add the InfinAssistant integration first, or enter device ID manually.
                  </p>
                `}
          </div>
        </div>
        <div class="form-row">
          <div class="form-field">
            <label>Theme Preset</label>
            <select
              .value=${this._config.theme.preset}
              @change=${(e: Event) =>
                this._updateConfig('theme', {
                  ...this._config.theme,
                  preset: (e.target as HTMLSelectElement).value as 'charcoal' | 'black',
                })}
            >
              <option value="charcoal">Charcoal</option>
              <option value="black">Black</option>
            </select>
          </div>
          <div class="form-field">
            <label>Accent Color</label>
            <input
              type="color"
              .value=${this._config.theme.accent || '#18A1FF'}
              @input=${(e: Event) =>
                this._updateConfig('theme', {
                  ...this._config.theme,
                  accent: (e.target as HTMLInputElement).value,
                })}
            />
          </div>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-title">Time Display</div>
        <div class="form-row">
          <div class="form-field">
            <label>Format</label>
            <select
              .value=${this._config.header.time.format}
              @change=${(e: Event) =>
                this._updateConfig('header', {
                  ...this._config.header,
                  time: {
                    ...this._config.header.time,
                    format: (e.target as HTMLSelectElement).value as 'HH:mm' | 'hh:mm',
                  },
                })}
            >
              <option value="HH:mm">24-hour (HH:mm)</option>
              <option value="hh:mm">12-hour (hh:mm)</option>
            </select>
          </div>
          <div class="form-field">
            <label>Alignment</label>
            <select
              .value=${this._config.header.time.align}
              @change=${(e: Event) =>
                this._updateConfig('header', {
                  ...this._config.header,
                  time: {
                    ...this._config.header.time,
                    align: (e.target as HTMLSelectElement).value as 'left' | 'center' | 'right',
                  },
                })}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-title">Status Bar</div>
        <div class="toggle-row">
          <span class="toggle-label">Enable status bar</span>
          <input
            type="checkbox"
            .checked=${this._config.status_bar.enabled}
            @change=${(e: Event) =>
              this._updateConfig('status_bar', {
                ...this._config.status_bar,
                enabled: (e.target as HTMLInputElement).checked,
              })}
          />
        </div>

        ${this._config.status_bar.enabled
          ? html`
              <div class="form-section-title" style="margin-top: 16px">Indicators</div>

              <div class="toggle-row">
                <span class="toggle-label">Battery</span>
                <input
                  type="checkbox"
                  .checked=${this._config.status_bar.battery}
                  @change=${(e: Event) =>
                    this._updateConfig('status_bar', {
                      ...this._config.status_bar,
                      battery: (e.target as HTMLInputElement).checked,
                    })}
                />
              </div>

              <div class="toggle-row">
                <span class="toggle-label">Bluetooth</span>
                <input
                  type="checkbox"
                  .checked=${this._config.status_bar.bluetooth}
                  @change=${(e: Event) =>
                    this._updateConfig('status_bar', {
                      ...this._config.status_bar,
                      bluetooth: (e.target as HTMLInputElement).checked,
                    })}
                />
              </div>

              <div class="toggle-row">
                <span class="toggle-label">Steps</span>
                <input
                  type="checkbox"
                  .checked=${this._config.status_bar.steps}
                  @change=${(e: Event) =>
                    this._updateConfig('status_bar', {
                      ...this._config.status_bar,
                      steps: (e.target as HTMLInputElement).checked,
                    })}
                />
              </div>

              <div class="toggle-row">
                <span class="toggle-label">Heart Rate</span>
                <input
                  type="checkbox"
                  .checked=${this._config.status_bar.heart_rate}
                  @change=${(e: Event) =>
                    this._updateConfig('status_bar', {
                      ...this._config.status_bar,
                      heart_rate: (e.target as HTMLInputElement).checked,
                    })}
                />
              </div>

              <div class="toggle-row">
                <span class="toggle-label">Notifications</span>
                <input
                  type="checkbox"
                  .checked=${this._config.status_bar.notifications}
                  @change=${(e: Event) =>
                    this._updateConfig('status_bar', {
                      ...this._config.status_bar,
                      notifications: (e.target as HTMLInputElement).checked,
                    })}
                />
              </div>

              <div class="form-section-title" style="margin-top: 16px">Custom Entity Sources (Optional)</div>

              <div class="form-row column">
                <div class="form-field">
                  <label>Steps Entity</label>
                  ${this._renderEntityInput(
                    this._config.status_bar.sources.steps_entity || '',
                    (value) =>
                      this._updateConfig('status_bar', {
                        ...this._config.status_bar,
                        sources: {
                          ...this._config.status_bar.sources,
                          steps_entity: value || null,
                        },
                      }),
                    'sensor',
                    'sensor.steps'
                  )}
                </div>
                <div class="form-field">
                  <label>Heart Rate Entity</label>
                  ${this._renderEntityInput(
                    this._config.status_bar.sources.hr_entity || '',
                    (value) =>
                      this._updateConfig('status_bar', {
                        ...this._config.status_bar,
                        sources: {
                          ...this._config.status_bar.sources,
                          hr_entity: value || null,
                        },
                      }),
                    'sensor',
                    'sensor.heart_rate'
                  )}
                </div>
                <div class="form-field">
                  <label>Notifications Entity</label>
                  ${this._renderEntityInput(
                    this._config.status_bar.sources.notifications_entity || '',
                    (value) =>
                      this._updateConfig('status_bar', {
                        ...this._config.status_bar,
                        sources: {
                          ...this._config.status_bar.sources,
                          notifications_entity: value || null,
                        },
                      }),
                    'sensor',
                    'sensor.notifications'
                  )}
                </div>
              </div>
            `
          : nothing}
      </div>

      <div class="form-section">
        <div class="form-section-title">Advanced</div>

        <div class="toggle-row">
          <span class="toggle-label">Enable compression</span>
          <input
            type="checkbox"
            .checked=${this._config.advanced.compression}
            @change=${(e: Event) =>
              this._updateConfig('advanced', {
                ...this._config.advanced,
                compression: (e.target as HTMLInputElement).checked,
              })}
          />
        </div>

        <div class="form-row">
          <div class="form-field">
            <label>Min Update Interval (ms)</label>
            <input
              type="number"
              min="100"
              max="60000"
              .value=${String(this._config.advanced.min_update_interval_ms)}
              @input=${(e: Event) =>
                this._updateConfig('advanced', {
                  ...this._config.advanced,
                  min_update_interval_ms: parseInt((e.target as HTMLInputElement).value, 10) || 1000,
                })}
            />
          </div>
          <div class="form-field">
            <label>Full Refresh (minutes)</label>
            <input
              type="number"
              min="1"
              max="60"
              .value=${String(this._config.advanced.full_refresh_minutes)}
              @input=${(e: Event) =>
                this._updateConfig('advanced', {
                  ...this._config.advanced,
                  full_refresh_minutes: parseInt((e.target as HTMLInputElement).value, 10) || 15,
                })}
            />
          </div>
        </div>

        <div class="toggle-row">
          <span class="toggle-label">Show bounds overlay</span>
          <input
            type="checkbox"
            .checked=${this._config.advanced.debug.show_bounds}
            @change=${(e: Event) =>
              this._updateConfig('advanced', {
                ...this._config.advanced,
                debug: {
                  ...this._config.advanced.debug,
                  show_bounds: (e.target as HTMLInputElement).checked,
                },
              })}
          />
        </div>

        <div class="toggle-row">
          <span class="toggle-label">Show truncation markers</span>
          <input
            type="checkbox"
            .checked=${this._config.advanced.debug.show_truncation}
            @change=${(e: Event) =>
              this._updateConfig('advanced', {
                ...this._config.advanced,
                debug: {
                  ...this._config.advanced.debug,
                  show_truncation: (e.target as HTMLInputElement).checked,
                },
              })}
          />
        </div>

        <p style="font-size: 12px; color: var(--secondary-text-color); margin-top: 8px;">
          Estimated payload size: ${this._watchLayout ? Math.round(estimatePayloadSize(this._watchLayout) / 1024 * 10) / 10 : 0} KB
        </p>
      </div>
    `;
  }

  private _applyDefaultTemplate(): void {
    // Apply a sensible default configuration
    const newConfig: CardConfig = {
      ...this._config,
      tiles: [
        { ...DEFAULT_TILE_CONFIG, enabled: true, label: 'DOORS', icon: 'door', type: 'count', entity: '' },
        { ...DEFAULT_TILE_CONFIG, enabled: true, label: 'GARAGE', icon: 'garage', type: 'cover_state', entity: '' },
        { ...DEFAULT_TILE_CONFIG, enabled: true, label: 'LIGHTS', icon: 'light', type: 'count', entity: '' },
        { ...DEFAULT_TILE_CONFIG, enabled: true, label: 'TEMP', icon: 'home', type: 'sensor_value', entity: '' },
      ],
      actions: [
        { ...DEFAULT_ACTION_CONFIG, enabled: true, label: 'GARAGE', icon: 'garage', action: 'cover.toggle', entity: '' },
        { ...DEFAULT_ACTION_CONFIG, enabled: true, label: 'LIGHTS', icon: 'light', action: 'toggle', entity: '' },
        { ...DEFAULT_ACTION_CONFIG, enabled: true, label: 'MUSIC', icon: 'music', action: 'media.play_pause', entity: '' },
      ],
    };

    this._config = newConfig;
    this._fireConfigChanged();
  }


  private _renderPresenceIconItem(icon: PresenceIconConfig, index: number): TemplateResult {
    return html`
      <div class="list-item">
        <span class="drag-handle" aria-hidden="true">\u2630</span>
        <div class="list-item-content">
          <select
            .value=${icon.icon}
            @change=${(e: Event) =>
              this._updatePresenceIcon(index, {
                ...icon,
                icon: (e.target as HTMLSelectElement).value as PresenceIconConfig['icon'],
              })}
          >
            ${getPresenceGlyphOptions().map(
              (opt) => html`<option value=${opt.value}>${opt.label}</option>`
            )}
          </select>
          <div style="flex: 1">
            ${this._renderEntityInput(
              icon.entity,
              (value) => this._updatePresenceIcon(index, { ...icon, entity: value }),
              undefined,
              'person.john'
            )}
          </div>
        </div>
        <div class="list-item-actions">
          <button aria-label="Remove presence icon ${index + 1}" @click=${() => this._removePresenceIcon(index)}>\u2715</button>
        </div>
      </div>
    `;
  }

  private _addPresenceIcon(): void {
    const icons = [...this._config.header.presence.icons];
    icons.push({
      icon: 'person_male',
      entity: '',
      hide_if_unknown: false,
    });
    this._updateConfig('header', {
      ...this._config.header,
      presence: { ...this._config.header.presence, icons },
    });
  }

  private _updatePresenceIcon(index: number, icon: PresenceIconConfig): void {
    const icons = [...this._config.header.presence.icons];
    icons[index] = icon;
    this._updateConfig('header', {
      ...this._config.header,
      presence: { ...this._config.header.presence, icons },
    });
  }

  private _removePresenceIcon(index: number): void {
    const icons = this._config.header.presence.icons.filter((_, i) => i !== index);
    this._updateConfig('header', {
      ...this._config.header,
      presence: { ...this._config.header.presence, icons },
    });
  }

  // ========== SCREENS TAB ==========
  private _renderScreensTab(): TemplateResult {
    const screens = this._config.screens || [];
    const maxScreens = MAX_SCREENS;

    return html`
      <div class="form-section">
        <div class="form-section-title">Multi-Screen Configuration</div>
        <p style="font-size: 12px; color: var(--secondary-text-color); margin-bottom: 16px;">
          Configure up to ${maxScreens} swipeable screens. Screen 0 is typically a dashboard, Screens 1-${maxScreens - 1} can be tile/action screens.
        </p>

        ${screens.length === 0
          ? html`
              <p style="color: var(--secondary-text-color)">No screens configured. Add a screen to get started.</p>
            `
          : html`
              <div class="screens-list" style="margin-bottom: 16px;">
                ${screens.map((screen, index) => this._renderScreenListItem(screen, index))}
              </div>
            `}

        ${screens.length < maxScreens
          ? html`
              <button class="add-item-button" @click=${this._addScreen}>
                + Add Screen
              </button>
            `
          : html`
              <p style="color: var(--warning-color); font-size: 12px;">
                Maximum ${maxScreens} screens reached
              </p>
            `}
      </div>

      ${this._selectedScreenIndex >= 0 && this._selectedScreenIndex < screens.length
        ? this._renderScreenEditor(screens[this._selectedScreenIndex], this._selectedScreenIndex)
        : nothing}
    `;
  }

  private _renderScreenListItem(screen: any, index: number): TemplateResult {
    const isSelected = this._selectedScreenIndex === index;
    const screenTypeName = screen.screenType === 'dashboard' ? 'Dashboard'
      : screen.screenType === 'logbook' ? 'Tiles'
      : 'Tiles';

    return html`
      <div
        class="list-item ${isSelected ? 'selected' : ''}"
        role="button"
        tabindex="0"
        aria-label="Screen ${index}: ${screenTypeName}${screen.name ? ' - ' + screen.name : ''}"
        aria-pressed=${isSelected}
        @click=${() => (this._selectedScreenIndex = index)}
        @keydown=${(e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this._selectedScreenIndex = index;
          }
        }}
        style="cursor: pointer; padding: 12px; margin-bottom: 8px; border-radius: 4px; background: var(--secondary-background-color);"
      >
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-weight: bold; color: var(--primary-text-color);">Screen ${index}</span>
          <span style="color: var(--secondary-text-color); font-size: 12px;">${screenTypeName}</span>
          ${screen.name ? html`<span style="color: var(--secondary-text-color); font-size: 12px;">- ${screen.name}</span>` : nothing}
        </div>
        <div class="list-item-actions" style="margin-left: auto;">
          ${index > 0
            ? html`<button aria-label="Move screen ${index} up" @click=${(e: Event) => { e.stopPropagation(); this._moveScreen(index, -1); }}>\u2191</button>`
            : nothing}
          ${index < (this._config.screens || []).length - 1
            ? html`<button aria-label="Move screen ${index} down" @click=${(e: Event) => { e.stopPropagation(); this._moveScreen(index, 1); }}>\u2193</button>`
            : nothing}
          <button aria-label="Remove screen ${index}" @click=${(e: Event) => { e.stopPropagation(); this._removeScreen(index); }}>\u2715</button>
        </div>
      </div>
    `;
  }

  private _renderScreenEditor(screen: any, index: number): TemplateResult {
    return html`
      <div class="form-section" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--divider-color);">
        <div class="form-section-title">Screen ${index} Configuration</div>

        <div class="form-row">
          <div class="form-field">
            <label>Screen Type</label>
            <select
              .value=${screen.screenType === 'dashboard' ? 'dashboard' : 'tiles'}
              @change=${(e: Event) =>
                this._updateScreen(index, {
                  ...screen,
                  screenType: (e.target as HTMLSelectElement).value,
                })}
            >
              <option value="dashboard">Dashboard (read-only)</option>
              <option value="tiles">Tiles</option>
            </select>
          </div>
          <div class="form-field">
            <label>Name (optional)</label>
            <input
              type="text"
              .value=${screen.name || ''}
              @input=${(e: Event) =>
                this._updateScreen(index, {
                  ...screen,
                  name: (e.target as HTMLInputElement).value || undefined,
                })}
              placeholder="Home"
              maxlength="20"
            />
          </div>
        </div>

        ${screen.screenType === 'dashboard'
          ? this._renderDashboardScreenConfig(screen, index)
          : this._renderTilesActionsScreenConfig(screen, index)}
      </div>
    `;
  }

  private _renderDashboardScreenConfig(screen: any, screenIndex: number): TemplateResult {
    const dashboard = screen.dashboard || {
      statusGroups: [],
      sensorGroups: [],
      weather: undefined,
      events: [],
      notifications: [],
    };


    const weatherFilterId = `weather_${screenIndex}`;

    return html`
      <div class="form-section">
        <div class="form-section-title">Weather</div>
        <div class="form-field">
          <label>Weather Entity</label>
          ${this._renderDeviceFilter(weatherFilterId)}
          ${this._renderSearchableEntitySelect(
            weatherFilterId,
            dashboard.weather?.entity || '',
            ['weather'],
            (entity) => {
              this._updateDashboard(screenIndex, {
                ...dashboard,
                weather: entity ? { entity } : undefined,
              });
            },
            'Type to search weather entities...'
          )}
        </div>
      </div>

      ${this._renderDashboardCalendars(dashboard, screenIndex)}

      <div class="form-section">
        <div class="form-section-title">Status Groups</div>
        <p style="font-size: 12px; color: var(--secondary-text-color); margin-bottom: 12px;">
          Status groups display binary states (open/closed, on/off) with glyphs. Each glyph has a symbol (letter) and entity.
        </p>

        ${['doors', 'garage', 'motion', 'lights', 'media'].map((groupType) => {
          const group = dashboard.statusGroups?.find((g: any) => g.type === groupType);
          const glyphs = group?.glyphs || [];

          return html`
            <div style="margin-bottom: 16px; padding: 12px; background: var(--secondary-background-color); border-radius: 4px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-weight: bold; text-transform: uppercase;">${groupType}</span>
                <button
                  class="add-item-button"
                  style="padding: 4px 8px; font-size: 11px;"
                  @click=${() => this._addStatusGlyph(screenIndex, groupType)}
                >
                  + Add Glyph
                </button>
              </div>

              ${glyphs.length > 0
                ? html`
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                      ${glyphs.map((glyph: any, glyphIndex: number) =>
                        this._renderStatusGlyph(screenIndex, groupType, glyph, glyphIndex)
                      )}
                    </div>
                  `
                : html`<p style="font-size: 11px; color: var(--secondary-text-color); margin: 0;">No glyphs configured</p>`}
            </div>
          `;
        })}
      </div>

      <div class="form-section">
        <div class="form-section-title">Sensor Groups</div>
        <p style="font-size: 12px; color: var(--secondary-text-color); margin-bottom: 12px;">
          Sensor groups display numeric values (temperatures, presence). Each sensor has an entity and display type.
        </p>

        ${['thermostats', 'freezers', 'beacons'].map((groupType) => {
          const group = dashboard.sensorGroups?.find((g: any) => g.type === groupType);
          const sensors = group?.sensors || [];

          return html`
            <div style="margin-bottom: 16px; padding: 12px; background: var(--secondary-background-color); border-radius: 4px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-weight: bold; text-transform: uppercase;">${groupType}</span>
                <button
                  class="add-item-button"
                  style="padding: 4px 8px; font-size: 11px;"
                  @click=${() => this._addSensor(screenIndex, groupType)}
                >
                  + Add Sensor
                </button>
              </div>

              ${sensors.length > 0
                ? html`
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                      ${sensors.map((sensor: any, sensorIndex: number) =>
                        this._renderSensor(screenIndex, groupType, sensor, sensorIndex)
                      )}
                    </div>
                  `
                : html`<p style="font-size: 11px; color: var(--secondary-text-color); margin: 0;">No sensors configured</p>`}
            </div>
          `;
        })}
      </div>

      <div class="form-section">
        <div class="form-section-title">Inline &amp; Headline</div>
        <p style="font-size: 12px; color: var(--secondary-text-color); margin-bottom: 12px;">
          Headline value: one entity shown as a prominent row below the meeting rows.
          Inline metrics: two entity values displayed on either side of the clock (2-char label each).
        </p>

        <div style="margin-bottom: 16px; padding: 12px; background: var(--secondary-background-color); border-radius: 4px;">
          <div style="font-weight: bold; margin-bottom: 8px;">Headline Value</div>
          <div class="form-row">
            <div class="form-field" style="flex: 0 0 120px;">
              <label>Label (max 11)</label>
              <input
                type="text"
                maxlength="11"
                .value=${dashboard.configurableValue?.label || ''}
                placeholder="e.g. AQI"
                @input=${(e: Event) => {
                  const label = (e.target as HTMLInputElement).value.slice(0, 11);
                  this._updateDashboard(screenIndex, {
                    ...dashboard,
                    configurableValue: { ...(dashboard.configurableValue || { entity: '' }), label: label || undefined },
                  });
                }}
              />
            </div>
            <div class="form-field" style="flex: 1;">
              <label>Entity</label>
              ${this._renderSearchableEntitySelect(
                `cv_entity_${screenIndex}`,
                dashboard.configurableValue?.entity || '',
                [],
                (entity) => {
                  this._updateDashboard(screenIndex, {
                    ...dashboard,
                    configurableValue: entity
                      ? { ...(dashboard.configurableValue || {}), entity }
                      : undefined,
                  });
                },
                'Type to search entities...'
              )}
            </div>
          </div>
          ${dashboard.configurableValue?.entity
            ? html`
                <button
                  style="font-size: 11px; color: var(--error-color, #f44336); background: none; border: none; cursor: pointer; padding: 0; margin-top: 4px;"
                  aria-label="Clear headline value"
                  @click=${() => {
                    this._updateDashboard(screenIndex, { ...dashboard, configurableValue: undefined });
                  }}
                >Clear headline value</button>
              `
            : nothing}
        </div>

        ${[0, 1].map((slotIndex) => {
          const metric = dashboard.inlineMetrics?.[slotIndex];
          return html`
            <div style="margin-bottom: 12px; padding: 12px; background: var(--secondary-background-color); border-radius: 4px;">
              <div style="font-weight: bold; margin-bottom: 8px;">Inline Metric Slot ${slotIndex + 1} (${slotIndex === 0 ? 'left of clock' : 'right of clock'})</div>
              <div class="form-row">
                <div class="form-field" style="flex: 0 0 80px;">
                  <label>Label (max 2)</label>
                  <input
                    type="text"
                    maxlength="2"
                    .value=${metric?.label || ''}
                    placeholder="e.g. BR"
                    @input=${(e: Event) => {
                      const label = (e.target as HTMLInputElement).value.slice(0, 2);
                      const currentMetrics: [any?, any?] = [...(dashboard.inlineMetrics || [undefined, undefined])] as [any?, any?];
                      currentMetrics[slotIndex] = { ...(currentMetrics[slotIndex] || { entity: '' }), label: label || undefined };
                      this._updateDashboard(screenIndex, { ...dashboard, inlineMetrics: currentMetrics });
                    }}
                  />
                </div>
                <div class="form-field" style="flex: 1;">
                  <label>Entity</label>
                  ${this._renderSearchableEntitySelect(
                    `im${slotIndex}_entity_${screenIndex}`,
                    metric?.entity || '',
                    [],
                    (entity) => {
                      const currentMetrics: [any?, any?] = [...(dashboard.inlineMetrics || [undefined, undefined])] as [any?, any?];
                      currentMetrics[slotIndex] = entity
                        ? { ...(currentMetrics[slotIndex] || {}), entity }
                        : undefined;
                      this._updateDashboard(screenIndex, { ...dashboard, inlineMetrics: currentMetrics });
                    },
                    'Type to search entities...'
                  )}
                </div>
              </div>
              ${metric?.entity
                ? html`
                    <button
                      style="font-size: 11px; color: var(--error-color, #f44336); background: none; border: none; cursor: pointer; padding: 0; margin-top: 4px;"
                      aria-label="Clear inline metric slot ${slotIndex + 1}"
                      @click=${() => {
                        const currentMetrics: [any?, any?] = [...(dashboard.inlineMetrics || [undefined, undefined])] as [any?, any?];
                        currentMetrics[slotIndex] = undefined;
                        this._updateDashboard(screenIndex, { ...dashboard, inlineMetrics: currentMetrics });
                      }}
                    >Clear slot ${slotIndex + 1}</button>
                  `
                : nothing}
            </div>
          `;
        })}
      </div>
      ${this._renderPresenceSection(dashboard, screenIndex)}
    `;
  }

  /**
   * The calendars a dashboard reads its events from (dashboard.events). None picked: every
   * calendar on the Calendar tab, as the app takes them; that tab's max events is how many events
   * show, not how many calendars are read.
   */
  private _renderDashboardCalendars(dashboard: any, screenIndex: number): TemplateResult {
    // A list only: YAML can make events anything (the validator says so), and a pick replaces it.
    const picked: string[] = (Array.isArray(dashboard.events) ? dashboard.events : [])
      .map((e: { calendar: string }) => e?.calendar)
      .filter((c: string) => !!c);
    const face = this._config.events;
    const faceCalendars = face.calendars.filter((c) => !!c);
    const byDefault = face.enabled ? faceCalendars : [];
    // The Calendar tab's first, then Home Assistant's others, then any picked that neither has.
    const offered = [...new Set([...faceCalendars, ...this._getEntities('calendar').sort(), ...picked])];
    const pick = (calendar: string, on: boolean) => {
      const events = offered
        .filter((c) => (c === calendar ? on : picked.includes(c)))
        .map((c) => ({ calendar: c }));
      this._updateDashboard(screenIndex, { ...dashboard, events: events.length > 0 ? events : undefined });
    };
    const source = picked.length > 0
      ? 'Only the calendars picked here are read.'
      : byDefault.length > 0
        ? `None picked: every calendar on the Calendar tab is read (${byDefault.length}).`
        : face.enabled
          ? 'None picked, and the Calendar tab has no calendars: the dashboard shows no events.'
          : 'None picked, and calendar events are off on the Calendar tab: the dashboard shows no events.';

    return html`
      <div class="form-section">
        <div class="form-section-title">Calendars</div>
        <p style="font-size: 12px; color: var(--secondary-text-color); margin-bottom: 8px;">
          The dashboard counts down to the next timed event of these calendars; all-day events are left out. ${source}
        </p>
        ${offered.length > 0
          ? html`
              <div style="display: flex; flex-direction: column; gap: 6px; padding: 8px 12px; background: var(--secondary-background-color); border-radius: 4px;">
                ${offered.map((calendar) => {
                  const name = (this.hass?.states[calendar]?.attributes as any)?.friendly_name;
                  return html`
                    <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer;">
                      <input
                        type="checkbox"
                        .checked=${picked.includes(calendar)}
                        @change=${(e: Event) => pick(calendar, (e.target as HTMLInputElement).checked)}
                      />
                      ${name ? html`<span>${name}</span>` : nothing}
                      <span style="font-family: monospace; font-size: 11px; color: var(--secondary-text-color);">${calendar}</span>
                      ${picked.length === 0 && byDefault.includes(calendar)
                        ? html`<span style="font-size: 11px; color: var(--secondary-text-color);">(read by default)</span>`
                        : nothing}
                    </label>
                  `;
                })}
              </div>
            `
          : html`<p style="font-size: 11px; color: var(--secondary-text-color); margin: 0;">No calendars in Home Assistant.</p>`}
      </div>
    `;
  }

  private _renderLogbookScreenConfig(screen: any, screenIndex: number): TemplateResult {
    const logbook = screen.logbook || { entityIds: [], maxEntries: 15, hoursBack: 12 };
    const allEntities = this.hass ? Object.keys(this.hass.states).sort() : [];

    return html`
      <div class="form-section" style="margin-top: 16px;">
        <div class="form-section-title">Logbook Configuration</div>
        <p style="font-size: 12px; color: var(--secondary-text-color); margin-bottom: 12px;">
          Shows recent state changes for selected entities on the watch.
        </p>

        <div class="form-row">
          <div class="form-field">
            <label>Hours Back</label>
            <input
              type="number"
              min="1"
              max="48"
              .value=${String(logbook.hoursBack)}
              @input=${(e: Event) => {
                const val = parseInt((e.target as HTMLInputElement).value) || 12;
                this._updateScreenLogbook(screenIndex, { ...logbook, hoursBack: Math.min(Math.max(val, 1), 48) });
              }}
            />
          </div>
          <div class="form-field">
            <label>Max Entries</label>
            <input
              type="number"
              min="1"
              max="15"
              .value=${String(logbook.maxEntries)}
              @input=${(e: Event) => {
                const val = parseInt((e.target as HTMLInputElement).value) || 15;
                this._updateScreenLogbook(screenIndex, { ...logbook, maxEntries: Math.min(Math.max(val, 1), 15) });
              }}
            />
          </div>
        </div>

        <div class="form-section-title" style="margin-top: 12px;">Entities (${logbook.entityIds.length})</div>
        ${logbook.entityIds.map((entityId: string, idx: number) => html`
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <select
              .value=${entityId}
              @change=${(e: Event) => {
                const ids = [...logbook.entityIds];
                ids[idx] = (e.target as HTMLSelectElement).value;
                this._updateScreenLogbook(screenIndex, { ...logbook, entityIds: ids });
              }}
              style="flex: 1;"
            >
              <option value="">-- Select entity --</option>
              ${allEntities.map(eid => html`<option value=${eid} ?selected=${eid === entityId}>${eid}</option>`)}
            </select>
            <button aria-label="Remove logbook entity ${idx + 1}" @click=${() => {
              const ids = logbook.entityIds.filter((_: string, i: number) => i !== idx);
              this._updateScreenLogbook(screenIndex, { ...logbook, entityIds: ids });
            }}>\u2715</button>
          </div>
        `)}
        ${logbook.entityIds.length < 10 ? html`
          <button class="add-item-button" @click=${() => {
            this._updateScreenLogbook(screenIndex, { ...logbook, entityIds: [...logbook.entityIds, ''] });
          }}>+ Add Entity</button>
        ` : nothing}

        <button
          style="margin-top: 8px; padding: 6px 12px; border: 1px solid var(--primary-color); background: transparent; color: var(--primary-color); border-radius: 4px; cursor: pointer; font-size: 12px;"
          aria-label=${this._showLogbookCardPicker ? 'Close logbook card picker' : 'Copy entities from an existing logbook card'}
          aria-expanded=${this._showLogbookCardPicker}
          @click=${() => {
            this._showLogbookCardPicker = !this._showLogbookCardPicker;
            this._logbookImportMessage = null;
            if (this._showLogbookCardPicker) {
              this._loadLogbookCards();
            }
          }}
        >
          ${this._showLogbookCardPicker ? 'Close' : 'Copy from Logbook Card'}
        </button>

        ${this._logbookImportMessage ? html`
          <p style="font-size: 12px; color: var(--primary-color); margin-top: 4px;">
            ${this._logbookImportMessage}
          </p>
        ` : nothing}

        ${this._showLogbookCardPicker ? html`
          <div style="margin-top: 8px; padding: 12px; border: 1px solid var(--divider-color); border-radius: 4px; background: var(--card-background-color, #fff);">
            <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; margin-bottom: 8px; cursor: pointer;">
              <input
                type="checkbox"
                .checked=${this._searchAllDashboards}
                @change=${(e: Event) => {
                  this._searchAllDashboards = (e.target as HTMLInputElement).checked;
                  this._loadLogbookCards();
                }}
              />
              Search all dashboards
            </label>

            ${this._isLoadingLogbookCards ? html`
              <p style="font-size: 12px; color: var(--secondary-text-color);">Loading...</p>
            ` : this._discoveredLogbookCards.length === 0 ? html`
              <p style="font-size: 12px; color: var(--secondary-text-color);">
                No logbook cards found.${!this._searchAllDashboards ? ' Try checking "Search all dashboards".' : ''}
              </p>
            ` : html`
              ${this._discoveredLogbookCards.map(card => html`
                <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 8px; margin-bottom: 4px; border: 1px solid var(--divider-color); border-radius: 4px;">
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 13px; font-weight: 500;">${card.title}</div>
                    <div style="font-size: 11px; color: var(--secondary-text-color);">
                      ${card.dashboardTitle} / ${card.viewTitle} &middot; ${card.entities.length} ${card.entities.length === 1 ? 'entity' : 'entities'}
                    </div>
                    <div style="font-size: 11px; color: var(--secondary-text-color); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      ${card.entities.slice(0, 4).join(', ')}${card.entities.length > 4 ? `, +${card.entities.length - 4} more` : ''}
                    </div>
                  </div>
                  <button
                    style="padding: 4px 10px; border: 1px solid var(--primary-color); background: var(--primary-color); color: white; border-radius: 4px; cursor: pointer; font-size: 12px; white-space: nowrap; margin-left: 8px;"
                    aria-label="Copy entities from ${card.title}"
                    @click=${() => this._importLogbookEntities(card, screenIndex)}
                  >Copy</button>
                </div>
              `)}
            `}
          </div>
        ` : nothing}
      </div>
    `;
  }

  /**
   * Presence-icon editor for a dashboard screen.
   *
   * This block previously sat at the end of _renderLogbookScreenConfig, where
   * `dashboard` is not in scope — every reference threw a ReferenceError at
   * render time and the section could never be used.
   */
  private _renderPresenceSection(dashboard: any, screenIndex: number): TemplateResult {
    return html`
      <div class="form-section">
        <div class="form-section-title">Presence Icons</div>
        <div class="toggle-row">
          <span class="toggle-label">Enable presence icons</span>
          <input
            type="checkbox"
            .checked=${!!dashboard.presence?.enabled}
            @change=${(e: Event) => {
              const enabled = (e.target as HTMLInputElement).checked;
              const prev = dashboard.presence || { enabled: false, home_zone: 'zone.home', long_away_threshold: '24:00:00', icons: [] };
              this._updateDashboard(screenIndex, { ...dashboard, presence: { ...prev, enabled } });
            }}
          />
        </div>

        ${dashboard.presence?.enabled
          ? html`
              <div class="form-row">
                <div class="form-field">
                  <label>Home Zone</label>
                  <input
                    type="text"
                    .value=${dashboard.presence.home_zone || ''}
                    @input=${(e: Event) =>
                      this._updateDashboard(screenIndex, {
                        ...dashboard,
                        presence: { ...dashboard.presence!, home_zone: (e.target as HTMLInputElement).value },
                      })}
                    placeholder="zone.home"
                  />
                </div>
                <div class="form-field">
                  <label>Long Away Threshold</label>
                  <input
                    type="text"
                    .value=${dashboard.presence.long_away_threshold || '24:00:00'}
                    @input=${(e: Event) =>
                      this._updateDashboard(screenIndex, {
                        ...dashboard,
                        presence: { ...dashboard.presence!, long_away_threshold: (e.target as HTMLInputElement).value },
                      })}
                    placeholder="24:00:00"
                  />
                </div>
              </div>

              <div class="reorderable-list">
                ${(dashboard.presence.icons || []).map((icon: PresenceIconConfig, idx: number) => html`
                  <div class="list-item">
                    <span class="drag-handle" aria-hidden="true">&#9776;</span>
                    <div class="list-item-content">
                      <select
                        .value=${icon.icon}
                        @change=${(e: Event) => {
                          const icons = [...(dashboard.presence!.icons || [])];
                          icons[idx] = { ...icon, icon: (e.target as HTMLSelectElement).value as PresenceIconConfig['icon'] };
                          this._updateDashboard(screenIndex, { ...dashboard, presence: { ...dashboard.presence!, icons } });
                        }}
                      >
                        ${getPresenceGlyphOptions().map(opt => html`<option value=${opt.value}>${opt.label}</option>`)}
                      </select>
                      <div style="flex: 1">
                        ${this._renderEntityInput(
                          icon.entity,
                          (value) => {
                            const icons = [...(dashboard.presence!.icons || [])];
                            icons[idx] = { ...icon, entity: value };
                            this._updateDashboard(screenIndex, { ...dashboard, presence: { ...dashboard.presence!, icons } });
                          },
                          undefined,
                          'person.john'
                        )}
                      </div>
                    </div>
                    <div class="list-item-actions">
                      <button
                        aria-label="Remove presence icon ${idx + 1}"
                        @click=${() => {
                          const icons = (dashboard.presence!.icons || []).filter((_: unknown, i: number) => i !== idx);
                          this._updateDashboard(screenIndex, { ...dashboard, presence: { ...dashboard.presence!, icons } });
                        }}
                      >&#10005;</button>
                    </div>
                  </div>
                `)}
              </div>

              ${(dashboard.presence.icons || []).length < MAX_PRESENCE_ICONS
                ? html`
                    <button
                      class="add-item-button"
                      @click=${() => {
                        const icons = [...(dashboard.presence!.icons || []), { icon: 'person_male' as PresenceIconConfig['icon'], entity: '', hide_if_unknown: false }];
                        this._updateDashboard(screenIndex, { ...dashboard, presence: { ...dashboard.presence!, icons } });
                      }}
                    >+ Add Presence Icon</button>
                  `
                : nothing}
            `
          : nothing}
      </div>
    `;
  }

  private _updateScreenLogbook(screenIndex: number, logbook: any): void {
    const screens = [...(this._config.screens || [])];
    screens[screenIndex] = { ...screens[screenIndex], logbook };
    this._updateConfig('screens', screens);
  }

  private _renderTilesActionsScreenConfig(screen: any, screenIndex: number): TemplateResult {
    const tiles = screen.tiles || [];
    const tileLayout = screen.tileLayout === 6 ? 6 : 4;
    const maxTiles = tileLayout;
    const gridLabel = tileLayout === 6 ? '3×2' : '2×2';
    const gridCols = tileLayout === 6 ? 3 : 2;

    return html`
      <div class="form-section">
        <div class="form-row" style="margin-bottom: 12px;">
          <div class="form-field">
            <label>Tile Layout</label>
            <select
              .value=${String(tileLayout)}
              @change=${(e: Event) =>
                this._updateScreen(screenIndex, {
                  ...screen,
                  tileLayout: parseInt((e.target as HTMLSelectElement).value, 10),
                })}
            >
              <option value="4">4 Tiles (2×2)</option>
              <option value="6">6 Tiles (3×2)</option>
            </select>
          </div>
        </div>

        <div class="form-section-title">Tiles (max ${maxTiles})</div>
        <p style="font-size: 12px; color: var(--secondary-text-color); margin-bottom: 12px;">
          ${tiles.length} / ${maxTiles} tiles configured (${gridLabel} grid)
        </p>

        <!-- Quick Add Buttons -->
        ${tiles.length < maxTiles
          ? html`
              <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
                <button class="add-item-button" @click=${() => this._addScreenTile(screenIndex)}>
                  + Add Tile
                </button>
                <button class="add-item-button" style="background: var(--primary-color); color: white;" @click=${() => this._addQuickLightTile(screenIndex)}>
                  Quick Light
                </button>
              </div>
            `
          : nothing}

        <!-- Tile List -->
        ${tiles.length > 0
          ? html`
              <div class="tile-grid" style="display: grid; grid-template-columns: repeat(${gridCols}, 1fr); gap: 8px; margin-bottom: 16px;">
                ${tiles.map((tile, idx) => this._renderScreenTileSlot(screenIndex, tile, idx))}
              </div>
            `
          : html`<p style="font-size: 12px; color: var(--secondary-text-color); font-style: italic;">No tiles added yet. Click "+ Add Tile" or "Quick Light" to add one.</p>`}

        <!-- Tile Editor -->
        ${this._selectedScreenTileIndex >= 0 && this._selectedScreenTileIndex < tiles.length
          ? this._renderScreenTileEditor(screenIndex, tiles[this._selectedScreenTileIndex], this._selectedScreenTileIndex)
          : tiles.length > 0
            ? html`<p style="color: var(--secondary-text-color); font-size: 12px;">Click a tile above to configure it</p>`
            : nothing}
      </div>

    `;
  }

  private _addScreen(): void {
    const screens = [...(this._config.screens || [])];
    screens.push({
      screenType: 'tiles',
      tiles: [],
    });
    this._updateConfig('screens', screens);
    this._selectedScreenIndex = screens.length - 1;
  }

  private _updateScreen(index: number, screen: any): void {
    const screens = [...(this._config.screens || [])];
    screens[index] = screen;
    this._updateConfig('screens', screens);
  }

  private _removeScreen(index: number): void {
    const screens = (this._config.screens || []).filter((_, i) => i !== index);
    this._updateConfig('screens', screens);
    if (this._selectedScreenIndex >= screens.length) {
      this._selectedScreenIndex = Math.max(0, screens.length - 1);
    }
  }

  private _moveScreen(index: number, direction: number): void {
    const screens = [...(this._config.screens || [])];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= screens.length) return;

    [screens[index], screens[newIndex]] = [screens[newIndex], screens[index]];
    this._updateConfig('screens', screens);
    this._selectedScreenIndex = newIndex;
  }

  private _addScreenTile(screenIndex: number): void {
    const screens = [...(this._config.screens || [])];
    const screen = screens[screenIndex];
    screen.tiles = [...(screen.tiles || []), { ...DEFAULT_TILE_CONFIG }];
    this._updateConfig('screens', screens);
  }

  private _addQuickLightTile(screenIndex: number): void {
    const screens = [...(this._config.screens || [])];
    const screen = screens[screenIndex];
    const lightTile: TileConfig = {
      ...DEFAULT_TILE_CONFIG,
      enabled: true,
      label: 'LIGHT',
      icon: 'light',
      type: 'state_text',
      color: 'auto',
      tap: 'toggle',
      entity: '',  // User will select
    };
    screen.tiles = [...(screen.tiles || []), lightTile];
    this._updateConfig('screens', screens);
    // Auto-select the new tile for editing
    this._selectedScreenTileIndex = screen.tiles.length - 1;
  }

  private _renderTileDeviceSelect(screenIndex: number, tileIndex: number, tile: TileConfig): TemplateResult {
    // Ensure devices are loaded
    if (this._devices.length === 0) {
      this._loadDevices();
    }

    const filterId = `screen-tile-${screenIndex}-${tileIndex}`;
    const currentDeviceId = tile.device_id || '';

    return html`
      <select
        .value=${currentDeviceId}
        @change=${(e: Event) => {
          const deviceId = (e.target as HTMLSelectElement).value;
          // Update tile config with device_id
          this._updateScreenTile(screenIndex, tileIndex, {
            ...tile,
            device_id: deviceId || undefined,
            // Clear entity if device changes (to avoid invalid entity)
            entity: deviceId !== currentDeviceId ? '' : tile.entity,
          });
          // Also update the device filter for entity search
          this._deviceFilters = { ...this._deviceFilters, [filterId]: deviceId };
          this.requestUpdate();
        }}
        style="width: 100%; padding: 8px; border: 1px solid var(--divider-color); border-radius: 4px;"
      >
        <option value="">No device (all entities)</option>
        ${this._devices.map(
          (device) => html`
            <option value="${device.id}" ?selected=${device.id === currentDeviceId}>
              ${device.name}
            </option>
          `
        )}
      </select>
    `;
  }

  private _updateScreenTile(screenIndex: number, tileIndex: number, tile: TileConfig): void {
    const screens = [...(this._config.screens || [])];
    const screen = screens[screenIndex];
    const tiles = [...(screen.tiles || [])];
    tiles[tileIndex] = tile;
    screen.tiles = tiles;
    this._updateConfig('screens', screens);
  }

  private _removeScreenTile(screenIndex: number, tileIndex: number): void {
    const screens = [...(this._config.screens || [])];
    const screen = screens[screenIndex];
    screen.tiles = (screen.tiles || []).filter((_, i) => i !== tileIndex);
    this._updateConfig('screens', screens);
    // Reset selection if removed tile was selected
    if (this._selectedScreenTileIndex >= screen.tiles.length) {
      this._selectedScreenTileIndex = -1;
    }
  }

  private _renderScreenTileSlot(screenIndex: number, tile: TileConfig, index: number): TemplateResult {
    const isSelected = this._selectedScreenTileIndex === index;
    const isConfigured = tile.enabled && (tile.entity || tile.device_id);

    return html`
      <div
        class="tile-slot ${isSelected ? 'active' : ''} ${isConfigured ? 'configured' : ''}"
        role="button"
        tabindex="0"
        aria-label="Tile ${index + 1}: ${tile.label || 'Empty'}${isConfigured ? ' (configured)' : ''}"
        aria-pressed=${isSelected}
        style="cursor: pointer; padding: 8px; border-radius: 8px; text-align: center; border: 2px solid ${isSelected ? 'var(--primary-color)' : isConfigured ? 'var(--success-color, #4caf50)' : 'var(--divider-color)'}; background: ${isSelected ? 'var(--primary-color)' : 'transparent'}; color: ${isSelected ? 'white' : 'inherit'};"
        @click=${() => {
          this._selectedScreenTileIndex = index;
          // Sync device filter for entity search
          const filterId = `screen-tile-${screenIndex}-${index}`;
          this._deviceFilters = { ...this._deviceFilters, [filterId]: tile.device_id || '' };
        }}
        @keydown=${(e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this._selectedScreenTileIndex = index;
            const filterId = `screen-tile-${screenIndex}-${index}`;
            this._deviceFilters = { ...this._deviceFilters, [filterId]: tile.device_id || '' };
          }
        }}
      >
        <div style="font-size: 10px; opacity: 0.7;">${index + 1}</div>
        <div style="font-size: 12px; font-weight: 500;">${tile.label || 'Empty'}</div>
        ${tile.entity
          ? html`<div style="font-size: 9px; opacity: 0.6; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${tile.entity.split('.')[1] || tile.entity}</div>`
          : tile.device_id
            ? html`<div style="font-size: 9px; opacity: 0.6; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">📱 ${this._devices.find(d => d.id === tile.device_id)?.name || 'Device'}</div>`
            : nothing}
      </div>
    `;
  }

  private _renderScreenTileEditor(screenIndex: number, tile: TileConfig, tileIndex: number): TemplateResult {
    return html`
      <div class="form-section" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--divider-color)">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div class="form-section-title" style="margin: 0;">Tile ${tileIndex + 1} Configuration</div>
          <button
            style="background: var(--error-color, #f44336); color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;"
            aria-label="Remove tile ${tileIndex + 1}"
            @click=${() => this._removeScreenTile(screenIndex, tileIndex)}
          >
            Remove
          </button>
        </div>

        <div class="toggle-row">
          <span class="toggle-label">Enabled</span>
          <input
            type="checkbox"
            .checked=${tile.enabled}
            @change=${(e: Event) =>
              this._updateScreenTile(screenIndex, tileIndex, { ...tile, enabled: (e.target as HTMLInputElement).checked })}
          />
        </div>

        ${tile.enabled
          ? html`
              <!-- Device Selection (optional, filters entity list) -->
              <div class="form-row">
                <div class="form-field" style="flex: 1">
                  <label>Device (optional)</label>
                  ${this._renderTileDeviceSelect(screenIndex, tileIndex, tile)}
                  <p style="font-size: 10px; color: var(--secondary-text-color); margin-top: 4px;">
                    Select a device to filter entities. Entity is optional if device is set.
                  </p>
                </div>
              </div>

              <!-- Entity Selection -->
              <div class="form-row">
                <div class="form-field" style="flex: 1">
                  <label>Entity ${!tile.device_id ? html`<span style="color: var(--error-color);">*</span>` : '(optional)'}</label>
                  ${this._renderSearchableEntitySelect(
                    `screen-tile-${screenIndex}-${tileIndex}`,
                    tile.entity,
                    ['light', 'switch', 'sensor', 'binary_sensor', 'cover', 'climate', 'media_player', 'fan', 'lock', 'input_boolean'],
                    (value) => {
                      // Auto-configure based on entity domain
                      const domain = value.split('.')[0];
                      let updates: Partial<TileConfig> = { entity: value };

                      if (domain === 'light' || domain === 'switch' || domain === 'input_boolean') {
                        updates = { ...updates, tap: 'toggle', type: 'state_text', icon: domain === 'light' ? 'light' : 'power' };
                      } else if (domain === 'cover') {
                        updates = { ...updates, type: 'cover_state', icon: 'garage', tap: 'toggle' };
                      } else if (domain === 'lock') {
                        updates = { ...updates, type: 'state_text', icon: 'lock', tap: 'toggle' };
                      } else if (domain === 'climate') {
                        updates = { ...updates, type: 'sensor_value', icon: 'temperature', tap: 'more-info' };
                      } else if (domain === 'media_player') {
                        updates = { ...updates, type: 'media_count', icon: 'media', tap: 'more-info' };
                      } else if (domain === 'fan') {
                        updates = { ...updates, type: 'state_text', icon: 'fan', tap: 'toggle' };
                      } else if (domain === 'sensor' || domain === 'binary_sensor') {
                        updates = { ...updates, type: 'sensor_value', tap: 'none' };
                      }

                      this._updateScreenTile(screenIndex, tileIndex, { ...tile, ...updates });
                    },
                    'Search entities...'
                  )}
                  <p style="font-size: 10px; color: var(--secondary-text-color); margin-top: 4px;">
                    Type to search. Settings auto-configure based on entity type.
                  </p>
                </div>
              </div>

              <div class="form-row">
                <div class="form-field">
                  <label>Label (max 8 chars)</label>
                  <input
                    type="text"
                    .value=${tile.label}
                    @input=${(e: Event) =>
                      this._updateScreenTile(screenIndex, tileIndex, { ...tile, label: (e.target as HTMLInputElement).value.toUpperCase() })}
                    placeholder="LIGHT"
                    maxlength="8"
                  />
                </div>
                <div class="form-field">
                  <label>Label Type</label>
                  <select
                    .value=${tile.displayMode || 'text'}
                    @change=${(e: Event) =>
                      this._updateScreenTile(screenIndex, tileIndex, {
                        ...tile,
                        displayMode: (e.target as HTMLSelectElement).value as TileConfig['displayMode'],
                      })}
                  >
                    <option value="text">Text</option>
                    <option value="icon">Icon</option>
                  </select>
                </div>
              </div>

              <!-- Icon selector (only shown when Label Type == 'icon') -->
              ${(tile.displayMode || 'text') === 'icon'
                ? html`
              <div class="form-row">
                    <div class="form-field" style="flex: 1">
                      <label>Icon</label>
                      <select
                        .value=${tile.icon}
                        @change=${(e: Event) =>
                          this._updateScreenTile(screenIndex, tileIndex, {
                            ...tile,
                            icon: (e.target as HTMLSelectElement).value as TileConfig['icon'],
                          })}
                      >
                        ${getEntityGlyphOptions().map(
                          (opt) => html`<option value=${opt.value}>${opt.label}</option>`
                        )}
                      </select>
                    </div>
              </div>
                `
                : html``}
              </div>

              <div class="form-row">
                <div class="form-field">
                  <label>Display Type</label>
                  <select
                    .value=${tile.type}
                    @change=${(e: Event) =>
                      this._updateScreenTile(screenIndex, tileIndex, {
                        ...tile,
                        type: (e.target as HTMLSelectElement).value as TileConfig['type'],
                      })}
                  >
                    <option value="state_text">State Text (on/off)</option>
                    <option value="sensor_value">Sensor Value</option>
                    <option value="count">Count</option>
                    <option value="duration">Duration</option>
                    <option value="cover_state">Cover State</option>
                    <option value="media_count">Media State</option>
                  </select>
                </div>
                <div class="form-field">
                  <label>Tap Action</label>
                  <select
                    .value=${tile.tap}
                    @change=${(e: Event) =>
                      this._updateScreenTile(screenIndex, tileIndex, {
                        ...tile,
                        tap: (e.target as HTMLSelectElement).value as TileConfig['tap'],
                      })}
                  >
                    <option value="toggle">Toggle (on/off)</option>
                    <option value="more-info">More Info</option>
                    <option value="none">None</option>
                    <option value="service">Service Call</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-field">
                  <label>Color Mode</label>
                  <select
                    .value=${tile.color}
                    @change=${(e: Event) =>
                      this._updateScreenTile(screenIndex, tileIndex, {
                        ...tile,
                        color: (e.target as HTMLSelectElement).value as TileConfig['color'],
                      })}
                  >
                    <option value="auto">On (color by state)</option>
                    <option value="disabled">Off (static)</option>
                  </select>
                </div>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  // ========== DASHBOARD HELPERS ==========
  private _updateDashboard(screenIndex: number, dashboard: any): void {
    const screens = [...(this._config.screens || [])];
    screens[screenIndex] = { ...screens[screenIndex], dashboard };
    this._updateConfig('screens', screens);
  }

  private _renderStatusGlyph(
    screenIndex: number,
    groupType: string,
    glyph: any,
    glyphIndex: number
  ): TemplateResult {
    const filterId = `status_${screenIndex}_${groupType}_${glyphIndex}`;
    const domains = ['binary_sensor', 'cover', 'light', 'media_player', 'switch'];
    // The validator's warning for this symbol, here where it is typed.
    const symbolProblem = glyphSymbolProblem(glyph.symbol);

    return html`
      <div style="display: flex; flex-direction: column; gap: 8px; padding: 8px; background: var(--secondary-background-color); border-radius: 4px;">
        ${this._renderDeviceFilter(filterId)}
        <div style="display: flex; gap: 8px; align-items: center;">
          ${this._renderIconPicker(
            `icon_${filterId}`,
            glyph.symbol || '',
            (icon) => {
              this._updateStatusGlyph(screenIndex, groupType, glyphIndex, {
                ...glyph,
                symbol: icon,
              });
            }
          )}
          <input
            type="text"
            .value=${glyph.symbol || ''}
            @input=${(e: Event) =>
              this._updateStatusGlyph(screenIndex, groupType, glyphIndex, {
                ...glyph,
                symbol: (e.target as HTMLInputElement).value,
              })}
            placeholder="F"
            maxlength="3"
            style="width: 60px; text-align: center; font-family: monospace; font-weight: bold;"
          />
          ${this._renderSearchableEntitySelect(
            filterId,
            glyph.entity || '',
            domains,
            (entity) => {
              this._updateStatusGlyph(screenIndex, groupType, glyphIndex, {
                ...glyph,
                entity,
              });
            },
            'Type to search entities...'
          )}
          <button
            @click=${() => this._removeStatusGlyph(screenIndex, groupType, glyphIndex)}
            aria-label="Remove ${groupType} glyph ${glyphIndex + 1}"
            style="padding: 4px 8px; background: var(--error-color); color: white; border: none; border-radius: 4px; cursor: pointer;"
          >
            \u2715
          </button>
        </div>
        ${symbolProblem
          ? html`<div class="validation-message warning" role="status">\u26a0\ufe0f ${symbolProblem[0].toUpperCase()}${symbolProblem.slice(1)}.</div>`
          : nothing}
      </div>
    `;
  }

  private _renderSensor(
    screenIndex: number,
    groupType: string,
    sensor: any,
    sensorIndex: number
  ): TemplateResult {
    const domains = groupType === 'beacons' ? ['person', 'device_tracker'] : ['sensor', 'climate'];
    const filterId = `sensor_${screenIndex}_${groupType}_${sensorIndex}`;
    const isBeacon = sensor.displayType === 'presence';

    return html`
      <div style="display: flex; flex-direction: column; gap: 8px; padding: 8px; background: var(--secondary-background-color); border-radius: 4px;">
        ${this._renderDeviceFilter(filterId)}
        <div style="display: flex; gap: 8px; align-items: center;">
          ${isBeacon
            ? html`
                ${this._renderIconPicker(
                  `icon_${filterId}`,
                  sensor.symbol || '',
                  (icon) => {
                    this._updateSensor(screenIndex, groupType, sensorIndex, {
                      ...sensor,
                      symbol: icon,
                    });
                  }
                )}
                <input
                  type="text"
                  .value=${sensor.symbol || ''}
                  @input=${(e: Event) =>
                    this._updateSensor(screenIndex, groupType, sensorIndex, {
                      ...sensor,
                      symbol: (e.target as HTMLInputElement).value,
                    })}
                  placeholder="?"
                  maxlength="3"
                  style="width: 60px; text-align: center; font-family: monospace; font-weight: bold;"
                />
              `
            : nothing}
          ${this._renderSearchableEntitySelect(
            filterId,
            sensor.entity || '',
            domains,
            (entity) => {
              this._updateSensor(screenIndex, groupType, sensorIndex, {
                ...sensor,
                entity,
              });
            },
            'Type to search entities...'
          )}
          <select
            .value=${sensor.displayType || 'temperature'}
            @change=${(e: Event) =>
              this._updateSensor(screenIndex, groupType, sensorIndex, {
                ...sensor,
                displayType: (e.target as HTMLSelectElement).value,
              })}
            style="width: 120px;"
          >
            <option value="temperature">Temperature</option>
            <option value="presence">Presence</option>
          </select>
          <button
            @click=${() => this._removeSensor(screenIndex, groupType, sensorIndex)}
            aria-label="Remove ${groupType} sensor ${sensorIndex + 1}"
            style="padding: 4px 8px; background: var(--error-color); color: white; border: none; border-radius: 4px; cursor: pointer;"
          >
            \u2715
          </button>
        </div>
      </div>
    `;
  }

  private _addStatusGlyph(screenIndex: number, groupType: string): void {
    const screens = [...(this._config.screens || [])];
    const screen = screens[screenIndex];
    const dashboard = screen.dashboard || { statusGroups: [], sensorGroups: [] };

    let statusGroups = [...(dashboard.statusGroups || [])];
    let group = statusGroups.find((g: any) => g.type === groupType);

    if (!group) {
      group = { type: groupType, glyphs: [] };
      statusGroups.push(group);
    } else {
      statusGroups = statusGroups.map((g: any) =>
        g.type === groupType ? { ...g, glyphs: [...g.glyphs, { symbol: '', entity: '' }] } : g
      );
    }

    if (!statusGroups.find((g: any) => g.type === groupType)?.glyphs.length) {
      const groupIndex = statusGroups.findIndex((g: any) => g.type === groupType);
      statusGroups[groupIndex] = {
        ...statusGroups[groupIndex],
        glyphs: [{ symbol: '', entity: '' }],
      };
    }

    this._updateDashboard(screenIndex, { ...dashboard, statusGroups });
  }

  private _updateStatusGlyph(
    screenIndex: number,
    groupType: string,
    glyphIndex: number,
    glyph: any
  ): void {
    const screens = [...(this._config.screens || [])];
    const screen = screens[screenIndex];
    const dashboard = screen.dashboard || { statusGroups: [], sensorGroups: [] };

    const statusGroups = dashboard.statusGroups.map((g: any) => {
      if (g.type === groupType) {
        const glyphs = [...g.glyphs];
        glyphs[glyphIndex] = glyph;
        return { ...g, glyphs };
      }
      return g;
    });

    this._updateDashboard(screenIndex, { ...dashboard, statusGroups });
  }

  private _removeStatusGlyph(screenIndex: number, groupType: string, glyphIndex: number): void {
    const screens = [...(this._config.screens || [])];
    const screen = screens[screenIndex];
    const dashboard = screen.dashboard || { statusGroups: [], sensorGroups: [] };

    const statusGroups = dashboard.statusGroups.map((g: any) => {
      if (g.type === groupType) {
        return { ...g, glyphs: g.glyphs.filter((_: any, i: number) => i !== glyphIndex) };
      }
      return g;
    });

    this._updateDashboard(screenIndex, { ...dashboard, statusGroups });
  }

  private _addSensor(screenIndex: number, groupType: string): void {
    const screens = [...(this._config.screens || [])];
    const screen = screens[screenIndex];
    const dashboard = screen.dashboard || { statusGroups: [], sensorGroups: [] };

    let sensorGroups = [...(dashboard.sensorGroups || [])];
    let group = sensorGroups.find((g: any) => g.type === groupType);

    if (!group) {
      group = { type: groupType, sensors: [] };
      sensorGroups.push(group);
    } else {
      sensorGroups = sensorGroups.map((g: any) =>
        g.type === groupType
          ? { ...g, sensors: [...g.sensors, { entity: '', displayType: 'temperature' }] }
          : g
      );
    }

    if (!sensorGroups.find((g: any) => g.type === groupType)?.sensors.length) {
      const groupIndex = sensorGroups.findIndex((g: any) => g.type === groupType);
      sensorGroups[groupIndex] = {
        ...sensorGroups[groupIndex],
        sensors: [{ entity: '', displayType: 'temperature' }],
      };
    }

    this._updateDashboard(screenIndex, { ...dashboard, sensorGroups });
  }

  private _updateSensor(
    screenIndex: number,
    groupType: string,
    sensorIndex: number,
    sensor: any
  ): void {
    const screens = [...(this._config.screens || [])];
    const screen = screens[screenIndex];
    const dashboard = screen.dashboard || { statusGroups: [], sensorGroups: [] };

    const sensorGroups = dashboard.sensorGroups.map((g: any) => {
      if (g.type === groupType) {
        const sensors = [...g.sensors];
        sensors[sensorIndex] = sensor;
        return { ...g, sensors };
      }
      return g;
    });

    this._updateDashboard(screenIndex, { ...dashboard, sensorGroups });
  }

  private _removeSensor(screenIndex: number, groupType: string, sensorIndex: number): void {
    const screens = [...(this._config.screens || [])];
    const screen = screens[screenIndex];
    const dashboard = screen.dashboard || { statusGroups: [], sensorGroups: [] };

    const sensorGroups = dashboard.sensorGroups.map((g: any) => {
      if (g.type === groupType) {
        return { ...g, sensors: g.sensors.filter((_: any, i: number) => i !== sensorIndex) };
      }
      return g;
    });

    this._updateDashboard(screenIndex, { ...dashboard, sensorGroups });
  }

  // ========== EVENTS TAB ==========
  private _renderCalendarItem(calendar: string, index: number): TemplateResult {
    return html`
      <div class="list-item">
        <span class="drag-handle" aria-hidden="true">\u2630</span>
        <div class="list-item-content" style="flex: 1">
          ${this._renderEntityInput(
            calendar,
            (value) => this._updateCalendar(index, value),
            'calendar',
            'calendar.work'
          )}
        </div>
        <div class="list-item-actions">
          <button aria-label="Remove calendar ${index + 1}" @click=${() => this._removeCalendar(index)}>\u2715</button>
        </div>
      </div>
    `;
  }

  private _addCalendar(): void {
    const calendars = [...this._config.events.calendars, ''];
    this._updateConfig('events', {
      ...this._config.events,
      calendars,
    });
  }

  private _updateCalendar(index: number, calendar: string): void {
    const calendars = [...this._config.events.calendars];
    calendars[index] = calendar;
    this._updateConfig('events', {
      ...this._config.events,
      calendars,
    });
  }

  private _removeCalendar(index: number): void {
    const calendars = this._config.events.calendars.filter((_, i) => i !== index);
    this._updateConfig('events', {
      ...this._config.events,
      calendars,
    });
  }
  private _renderLogbookTab(): TemplateResult {
    const lb = this._config.logbook_app ?? { entities: [], hours_back: 12, max_entries: 10 };
    const updateLb = (patch: object) => this._updateConfig('logbook_app', { ...lb, ...patch });

    return html`
      <div class="form-section">
        <h3>Logbook App</h3>
        <p style="font-size: 12px; color: var(--secondary-text-color);">
          Configure the standalone Logbook app that appears in the watch app launcher.
        </p>

        <div class="form-row">
          <div class="form-field">
            <label>Hours back (1–48)</label>
            <input type="number" min="1" max="48"
              .value=${lb.hours_back}
              @change=${(e: Event) => updateLb({ hours_back: Math.min(48, Math.max(1, parseInt((e.target as HTMLInputElement).value) || 12)) })}
            />
          </div>
          <div class="form-field">
            <label>Max entries (1–15)</label>
            <input type="number" min="1" max="15"
              .value=${lb.max_entries}
              @change=${(e: Event) => updateLb({ max_entries: Math.min(15, Math.max(1, parseInt((e.target as HTMLInputElement).value) || 10)) })}
            />
          </div>
        </div>

        <div class="form-row column">
          <label>Entities to track (${lb.entities.length})</label>
          ${lb.entities.map((eid: string, i: number) => html`
            <div class="list-item-row">
              ${this._renderSearchableEntitySelect(
                `logbook-entity-${i}`,
                eid,
                [],
                (v: string) => {
                  const updated = [...lb.entities];
                  updated[i] = v;
                  updateLb({ entities: updated });
                },
                'Entity ID'
              )}
              <button class="icon-button" @click=${() => {
                const updated = lb.entities.filter((_: string, idx: number) => idx !== i);
                updateLb({ entities: updated });
              }}>✕</button>
            </div>
          `)}
          ${lb.entities.length < 15 ? html`
            <button class="add-item-button" @click=${() => updateLb({ entities: [...lb.entities, ''] })}>
              + Add Entity
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  private _renderHomeControlTab(): TemplateResult {
    const hc = this._config.home_control ?? { devices: [] };
    const updateHc = (patch: object) => this._updateConfig('home_control', { ...hc, ...patch });
    const DOMAINS = ['light', 'switch', 'cover', 'climate', 'fan', 'lock'];

    return html`
      <div class="form-section">
        <h3>Home Control App</h3>
        <p style="font-size: 12px; color: var(--secondary-text-color);">
          Configure devices shown in the Home Control app in the watch app launcher (max 8).
        </p>

        ${hc.devices.map((dev: any, i: number) => html`
          <div style="padding: 8px; margin-bottom: 8px; background: var(--secondary-background-color); border-radius: 4px;">
            <div class="form-row">
              <div class="form-field" style="flex: 2;">
                ${this._renderSearchableEntitySelect(
                  `homecontrol-device-${i}`,
                  dev.entity_id,
                  DOMAINS,
                  (v: string) => {
                    const updated = [...hc.devices];
                    updated[i] = { ...dev, entity_id: v };
                    updateHc({ devices: updated });
                  },
                  'Entity ID'
                )}
              </div>
              <div class="form-field">
                <input type="text" placeholder="Display name (optional)"
                  .value=${dev.name ?? ''}
                  @input=${(e: Event) => {
                    const updated = [...hc.devices];
                    updated[i] = { ...dev, name: (e.target as HTMLInputElement).value || undefined };
                    updateHc({ devices: updated });
                  }}
                />
              </div>
              <button class="icon-button" @click=${() => {
                updateHc({ devices: hc.devices.filter((_: any, idx: number) => idx !== i) });
              }}>✕</button>
            </div>
          </div>
        `)}

        ${hc.devices.length < 8 ? html`
          <button class="add-item-button" @click=${() =>
            updateHc({ devices: [...hc.devices, { entity_id: '' }] })}>
            + Add Device
          </button>
        ` : ''}
      </div>
    `;
  }

  private _renderEventsTab(): TemplateResult {
    const allCalendars = this._getEntities('calendar');

    return html`
      <div class="form-section">
        <div class="toggle-row">
          <span class="toggle-label">Enable calendar events</span>
          <input
            type="checkbox"
            .checked=${this._config.events.enabled}
            @change=${(e: Event) =>
              this._updateConfig('events', {
                ...this._config.events,
                enabled: (e.target as HTMLInputElement).checked,
              })}
          />
        </div>

        ${this._config.events.enabled
          ? html`
              <div style="margin: 12px 0; padding: 12px; background: var(--secondary-background-color); border-radius: 4px;">
                <button
                  class="add-item-button"
                  style="margin-bottom: 8px;"
                  @click=${() => {
                    this._updateConfig('events', {
                      ...this._config.events,
                      calendars: allCalendars,
                    });
                  }}
                >
                  Use All Calendars (${allCalendars.length} found)
                </button>
                <p style="font-size: 11px; color: var(--secondary-text-color); margin: 0;">
                  Click to automatically add all calendar entities from your Home Assistant /calendar page
                </p>
              </div>

              <div class="form-row column">
                <div class="form-field">
                  <label>Selected Calendars (${this._config.events.calendars.length})</label>
                  ${this._config.events.calendars.map((calendar, index) =>
                    this._renderCalendarItem(calendar, index)
                  )}
                  ${this._config.events.calendars.length < 10
                    ? html`
                        <button class="add-item-button" @click=${this._addCalendar}>
                          + Add Calendar Manually
                        </button>
                      `
                    : nothing}
                </div>
              </div>

              <div class="form-row">
                <div class="form-field">
                  <label>Max Events</label>
                  <select
                    .value=${String(this._config.events.max_events)}
                    @change=${(e: Event) =>
                      this._updateConfig('events', {
                        ...this._config.events,
                        max_events: parseInt((e.target as HTMLSelectElement).value, 10),
                      })}
                  >
                    <option value="0">0</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                  </select>
                </div>
                <div class="form-field">
                  <label>Soon Window</label>
                  <input
                    type="text"
                    .value=${this._config.events.soon_window}
                    @input=${(e: Event) =>
                      this._updateConfig('events', {
                        ...this._config.events,
                        soon_window: (e.target as HTMLInputElement).value,
                      })}
                    placeholder="01:00:00"
                  />
                </div>
              </div>

              <div class="toggle-row">
                <span class="toggle-label">Show "No events" when empty</span>
                <input
                  type="checkbox"
                  .checked=${this._config.events.show_if_empty}
                  @change=${(e: Event) =>
                    this._updateConfig('events', {
                      ...this._config.events,
                      show_if_empty: (e.target as HTMLInputElement).checked,
                    })}
                />
              </div>

              <div class="form-row">
                <div class="form-field">
                  <label>All-day Events</label>
                  <select
                    .value=${this._config.events.all_day}
                    @change=${(e: Event) =>
                      this._updateConfig('events', {
                        ...this._config.events,
                        all_day: (e.target as HTMLSelectElement).value as 'show_all_day' | 'hide' | 'banner',
                      })}
                  >
                    <option value="show_all_day">Show as "All day"</option>
                    <option value="hide">Hide</option>
                    <option value="banner">Show as banner</option>
                  </select>
                </div>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  // ========== TILES TAB ==========
  private _renderTilesTab(): TemplateResult {
    // Ensure we have 8 tile slots
    const tiles = [...this._config.tiles];
    while (tiles.length < MAX_TILES) {
      tiles.push({ ...DEFAULT_TILE_CONFIG });
    }

    return html`
      <div class="form-section">
        <div class="form-section-title">Tile Grid (2\u00D74)</div>
        <div class="tiles-grid">
          ${tiles.slice(0, MAX_TILES).map((tile, index) =>
            this._renderTileSlot(tile, index)
          )}
        </div>
      </div>

      ${this._selectedTileIndex >= 0
        ? this._renderTileEditor(tiles[this._selectedTileIndex], this._selectedTileIndex)
        : html`<p style="color: var(--secondary-text-color)">Click a tile to edit</p>`}
    `;
  }

  private _renderTileSlot(tile: TileConfig, index: number): TemplateResult {
    const isSelected = this._selectedTileIndex === index;
    const isConfigured = tile.enabled && tile.label;

    return html`
      <div
        class="tile-slot ${isSelected ? 'active' : ''} ${isConfigured ? 'configured' : ''}"
        role="button"
        tabindex="0"
        aria-label="Tile ${index + 1}: ${tile.label || 'Empty'}${isConfigured ? ' (configured)' : ''}"
        aria-pressed=${isSelected}
        @click=${() => (this._selectedTileIndex = index)}
        @keydown=${(e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this._selectedTileIndex = index;
          }
        }}
      >
        <span class="tile-slot-number">${index + 1}</span>
        ${isConfigured
          ? html`<span class="tile-slot-label">${tile.label}</span>`
          : html`<span class="tile-slot-label" style="opacity: 0.5">Empty</span>`}
      </div>
    `;
  }

  private _renderTileEditor(tile: TileConfig, index: number): TemplateResult {
    return html`
      <div class="form-section" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--divider-color)">
        <div class="form-section-title">Tile ${index + 1} Configuration</div>

        <div class="toggle-row">
          <span class="toggle-label">Enabled</span>
          <input
            type="checkbox"
            .checked=${tile.enabled}
            @change=${(e: Event) =>
              this._updateTile(index, { ...tile, enabled: (e.target as HTMLInputElement).checked })}
          />
        </div>

        ${tile.enabled
          ? html`
              <div class="form-row">
                <div class="form-field">
                  <label>Label</label>
                  <input
                    type="text"
                    .value=${tile.label}
                    @input=${(e: Event) =>
                      this._updateTile(index, { ...tile, label: (e.target as HTMLInputElement).value })}
                    placeholder="DOORS"
                    maxlength="8"
                  />
                </div>
                <div class="form-field">
                  <label>Icon</label>
                  <select
                    .value=${tile.icon}
                    @change=${(e: Event) =>
                      this._updateTile(index, {
                        ...tile,
                        icon: (e.target as HTMLSelectElement).value as TileConfig['icon'],
                      })}
                  >
                    ${getEntityGlyphOptions().map(
                      (opt) => html`<option value=${opt.value}>${opt.label}</option>`
                    )}
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-field">
                  <label>Type</label>
                  <select
                    .value=${tile.type}
                    @change=${(e: Event) =>
                      this._updateTile(index, {
                        ...tile,
                        type: (e.target as HTMLSelectElement).value as TileConfig['type'],
                      })}
                  >
                    <option value="count">Count</option>
                    <option value="duration">Duration</option>
                    <option value="state_text">State Text</option>
                    <option value="cover_state">Cover State</option>
                    <option value="media_count">Media State</option>
                    <option value="sensor_value">Sensor Value</option>
                  </select>
                </div>
                <div class="form-field">
                  <label>Color Mode</label>
                  <select
                    .value=${tile.color}
                    @change=${(e: Event) =>
                      this._updateTile(index, {
                        ...tile,
                        color: (e.target as HTMLSelectElement).value as TileConfig['color'],
                      })}
                  >
                    <option value="auto">On (color by state)</option>
                    <option value="disabled">Off (static)</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-field" style="flex: 2">
                  <label>Entity</label>
                  ${this._renderEntityInput(
                    tile.entity,
                    (value) => this._updateTile(index, { ...tile, entity: value }),
                    undefined,
                    'sensor.temperature'
                  )}
                </div>
              </div>

              <div class="form-row">
                <div class="form-field">
                  <label>Tap Action</label>
                  <select
                    .value=${tile.tap}
                    @change=${(e: Event) =>
                      this._updateTile(index, {
                        ...tile,
                        tap: (e.target as HTMLSelectElement).value as TileConfig['tap'],
                      })}
                  >
                    <option value="none">None</option>
                    <option value="toggle">Toggle</option>
                    <option value="more-info">More Info</option>
                    <option value="service">Service</option>
                  </select>
                </div>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _updateTile(index: number, tile: TileConfig): void {
    const tiles = [...this._config.tiles];
    while (tiles.length <= index) {
      tiles.push({ ...DEFAULT_TILE_CONFIG });
    }
    tiles[index] = tile;
    this._updateConfig('tiles', tiles);
  }

  // ========== ACTIONS TAB ==========
  private _renderActionsTab(): TemplateResult {
    const actions = [...this._config.actions];
    while (actions.length < MAX_ACTIONS) {
      actions.push({ ...DEFAULT_ACTION_CONFIG });
    }

    return html`
      <div class="form-section">
        <div class="form-section-title">Action Buttons (max 3)</div>

        ${actions.slice(0, MAX_ACTIONS).map((action, index) =>
          this._renderActionEditor(action, index)
        )}
      </div>
    `;
  }

  private _renderActionEditor(action: ActionConfig, index: number): TemplateResult {
    return html`
      <div class="form-section" style="padding: 12px; background: var(--secondary-background-color); border-radius: 4px; margin-bottom: 12px">
        <div class="toggle-row">
          <span class="toggle-label"><strong>Action ${index + 1}</strong></span>
          <input
            type="checkbox"
            .checked=${action.enabled}
            @change=${(e: Event) =>
              this._updateAction(index, { ...action, enabled: (e.target as HTMLInputElement).checked })}
          />
        </div>

        ${action.enabled
          ? html`
              <div class="form-row">
                <div class="form-field">
                  <label>Label</label>
                  <input
                    type="text"
                    .value=${action.label}
                    @input=${(e: Event) =>
                      this._updateAction(index, { ...action, label: (e.target as HTMLInputElement).value })}
                    placeholder="GARAGE"
                    maxlength="10"
                  />
                </div>
                <div class="form-field">
                  <label>Icon</label>
                  <select
                    .value=${action.icon}
                    @change=${(e: Event) =>
                      this._updateAction(index, {
                        ...action,
                        icon: (e.target as HTMLSelectElement).value as ActionConfig['icon'],
                      })}
                  >
                    ${getEntityGlyphOptions().map(
                      (opt) => html`<option value=${opt.value}>${opt.label}</option>`
                    )}
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-field" style="flex: 2">
                  <label>Entity</label>
                  ${this._renderEntityInput(
                    action.entity,
                    (value) => this._updateAction(index, { ...action, entity: value }),
                    undefined,
                    'light.living_room'
                  )}
                </div>
              </div>

              <div class="form-row">
                <div class="form-field">
                  <label>Action Type</label>
                  <select
                    .value=${action.action}
                    @change=${(e: Event) =>
                      this._updateAction(index, {
                        ...action,
                        action: (e.target as HTMLSelectElement).value as ActionConfig['action'],
                      })}
                  >
                    <option value="toggle">Toggle</option>
                    <option value="cover.toggle">Cover Toggle</option>
                    <option value="cover.open">Cover Open</option>
                    <option value="cover.close">Cover Close</option>
                    <option value="media.play_pause">Media Play/Pause</option>
                    <option value="script.run">Run Script</option>
                    <option value="scene.activate">Activate Scene</option>
                    <option value="light.dimmer">Light Dimmer</option>
                    <option value="service_call">Service Call</option>
                    <option value="device_action">Device Action</option>
                  </select>
                </div>
              </div>

              ${action.action === 'service_call'
                ? this._renderServiceCallConfig(action, index)
                : action.action === 'device_action'
                ? this._renderDeviceActionConfig(action, index)
                : nothing}

              <div class="toggle-row">
                <span class="toggle-label">State-based coloring</span>
                <input
                  type="checkbox"
                  .checked=${action.state_color}
                  @change=${(e: Event) =>
                    this._updateAction(index, { ...action, state_color: (e.target as HTMLInputElement).checked })}
                />
              </div>

              ${action.action === 'light.dimmer'
                ? this._renderDimmerConfig(action, index)
                : nothing}
            `
          : nothing}
      </div>
    `;
  }

  private _renderDimmerConfig(action: ActionConfig, index: number): TemplateResult {
    const dimmer = action.dimmer || DEFAULT_ACTION_CONFIG.dimmer!;

    return html`
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--divider-color)">
        <div class="form-section-title">Dimmer Settings</div>

        <div class="form-row">
          <div class="form-field">
            <label>Step Size (%)</label>
            <input
              type="number"
              min="1"
              max="25"
              .value=${String(dimmer.step_percent)}
              @input=${(e: Event) =>
                this._updateAction(index, {
                  ...action,
                  dimmer: {
                    ...dimmer,
                    step_percent: parseInt((e.target as HTMLInputElement).value, 10) || 10,
                  },
                })}
            />
          </div>
        </div>

        <div class="toggle-row">
          <span class="toggle-label">Enable swipe gestures</span>
          <input
            type="checkbox"
            .checked=${dimmer.swipe}
            @change=${(e: Event) =>
              this._updateAction(index, {
                ...action,
                dimmer: { ...dimmer, swipe: (e.target as HTMLInputElement).checked },
              })}
          />
        </div>

        <div class="toggle-row">
          <span class="toggle-label">Long-press overlay</span>
          <input
            type="checkbox"
            .checked=${dimmer.longpress_overlay}
            @change=${(e: Event) =>
              this._updateAction(index, {
                ...action,
                dimmer: { ...dimmer, longpress_overlay: (e.target as HTMLInputElement).checked },
              })}
          />
        </div>

        <div class="form-row">
          <div class="form-field">
            <label>On Brightness Default</label>
            <select
              .value=${dimmer.on_brightness_default}
              @change=${(e: Event) =>
                this._updateAction(index, {
                  ...action,
                  dimmer: {
                    ...dimmer,
                    on_brightness_default: (e.target as HTMLSelectElement).value as 'last' | 'fixed',
                  },
                })}
            >
              <option value="last">Last Known</option>
              <option value="fixed">Fixed Value</option>
            </select>
          </div>

          ${dimmer.on_brightness_default === 'fixed'
            ? html`
                <div class="form-field">
                  <label>Fixed Brightness (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    .value=${String(dimmer.fixed_percent)}
                    @input=${(e: Event) =>
                      this._updateAction(index, {
                        ...action,
                        dimmer: {
                          ...dimmer,
                          fixed_percent: parseInt((e.target as HTMLInputElement).value, 10) || 50,
                        },
                      })}
                  />
                </div>
              `
            : nothing}
        </div>
      </div>
    `;
  }

  private _renderServiceCallConfig(action: ActionConfig, index: number): TemplateResult {
    return html`
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--divider-color)">
        <div class="form-section-title">Service Call Settings</div>

        <div class="form-row">
          <div class="form-field">
            <label>Domain</label>
            <input
              type="text"
              .value=${action.domain || ''}
              @input=${(e: Event) =>
                this._updateAction(index, {
                  ...action,
                  domain: (e.target as HTMLInputElement).value,
                })}
              placeholder="light"
            />
          </div>
          <div class="form-field">
            <label>Service</label>
            <input
              type="text"
              .value=${action.service || ''}
              @input=${(e: Event) =>
                this._updateAction(index, {
                  ...action,
                  service: (e.target as HTMLInputElement).value,
                })}
              placeholder="turn_on"
            />
          </div>
        </div>
      </div>
    `;
  }

  private _renderDeviceActionConfig(action: ActionConfig, index: number): TemplateResult {
    // Load devices on first render if not loaded
    if (this._devices.length === 0) {
      this._loadDevices();
    }

    // Load actions for selected device
    if (action.device_id && !this._deviceActions[action.device_id]) {
      this._loadDeviceActions(action.device_id);
    }

    const selectedDeviceActions = action.device_id ? this._deviceActions[action.device_id] || [] : [];

    return html`
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--divider-color)">
        <div class="form-section-title">Device Action Settings</div>

        <div class="form-row">
          <div class="form-field">
            <label>Device</label>
            <select
              .value=${action.device_id || ''}
              @change=${(e: Event) => {
                const deviceId = (e.target as HTMLSelectElement).value;
                this._updateAction(index, {
                  ...action,
                  device_id: deviceId,
                  device_action: '', // Reset action when device changes
                });
                if (deviceId) {
                  this._loadDeviceActions(deviceId);
                }
              }}
            >
              <option value="">Select device...</option>
              ${this._devices.map(
                (device) => html`<option value=${device.id}>${device.name}</option>`
              )}
            </select>
          </div>
        </div>

        ${action.device_id
          ? html`
              <div class="form-row">
                <div class="form-field">
                  <label>Action</label>
                  <select
                    .value=${action.device_action || ''}
                    @change=${(e: Event) =>
                      this._updateAction(index, {
                        ...action,
                        device_action: (e.target as HTMLSelectElement).value,
                      })}
                  >
                    <option value="">Select action...</option>
                    ${selectedDeviceActions.map(
                      (da) => html`
                        <option value=${da.type + (da.subtype ? '::' + da.subtype : '')}>
                          ${da.description || da.type + (da.subtype ? ' - ' + da.subtype : '')}
                        </option>
                      `
                    )}
                  </select>
                </div>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _updateAction(index: number, action: ActionConfig): void {
    const actions = [...this._config.actions];
    while (actions.length <= index) {
      actions.push({ ...DEFAULT_ACTION_CONFIG });
    }
    actions[index] = action;
    this._updateConfig('actions', actions);
  }

  // ========== STATUS BAR TAB ==========
  private _renderStatusBarTab(): TemplateResult {
    return html`
      <div class="form-section">
        <div class="toggle-row">
          <span class="toggle-label">Enable status bar</span>
          <input
            type="checkbox"
            .checked=${this._config.status_bar.enabled}
            @change=${(e: Event) =>
              this._updateConfig('status_bar', {
                ...this._config.status_bar,
                enabled: (e.target as HTMLInputElement).checked,
              })}
          />
        </div>

        ${this._config.status_bar.enabled
          ? html`
              <div class="form-section-title" style="margin-top: 16px">Indicators</div>

              <div class="toggle-row">
                <span class="toggle-label">Battery</span>
                <input
                  type="checkbox"
                  .checked=${this._config.status_bar.battery}
                  @change=${(e: Event) =>
                    this._updateConfig('status_bar', {
                      ...this._config.status_bar,
                      battery: (e.target as HTMLInputElement).checked,
                    })}
                />
              </div>

              <div class="toggle-row">
                <span class="toggle-label">Bluetooth</span>
                <input
                  type="checkbox"
                  .checked=${this._config.status_bar.bluetooth}
                  @change=${(e: Event) =>
                    this._updateConfig('status_bar', {
                      ...this._config.status_bar,
                      bluetooth: (e.target as HTMLInputElement).checked,
                    })}
                />
              </div>

              <div class="toggle-row">
                <span class="toggle-label">Steps</span>
                <input
                  type="checkbox"
                  .checked=${this._config.status_bar.steps}
                  @change=${(e: Event) =>
                    this._updateConfig('status_bar', {
                      ...this._config.status_bar,
                      steps: (e.target as HTMLInputElement).checked,
                    })}
                />
              </div>

              <div class="toggle-row">
                <span class="toggle-label">Heart Rate</span>
                <input
                  type="checkbox"
                  .checked=${this._config.status_bar.heart_rate}
                  @change=${(e: Event) =>
                    this._updateConfig('status_bar', {
                      ...this._config.status_bar,
                      heart_rate: (e.target as HTMLInputElement).checked,
                    })}
                />
              </div>

              <div class="toggle-row">
                <span class="toggle-label">Notifications</span>
                <input
                  type="checkbox"
                  .checked=${this._config.status_bar.notifications}
                  @change=${(e: Event) =>
                    this._updateConfig('status_bar', {
                      ...this._config.status_bar,
                      notifications: (e.target as HTMLInputElement).checked,
                    })}
                />
              </div>

              <div class="form-section-title" style="margin-top: 16px">Custom Entity Sources (Optional)</div>

              <div class="form-row column">
                <div class="form-field">
                  <label>Steps Entity</label>
                  ${this._renderEntityInput(
                    this._config.status_bar.sources.steps_entity || '',
                    (value) =>
                      this._updateConfig('status_bar', {
                        ...this._config.status_bar,
                        sources: {
                          ...this._config.status_bar.sources,
                          steps_entity: value || null,
                        },
                      }),
                    'sensor',
                    'sensor.steps'
                  )}
                </div>
                <div class="form-field">
                  <label>Heart Rate Entity</label>
                  ${this._renderEntityInput(
                    this._config.status_bar.sources.hr_entity || '',
                    (value) =>
                      this._updateConfig('status_bar', {
                        ...this._config.status_bar,
                        sources: {
                          ...this._config.status_bar.sources,
                          hr_entity: value || null,
                        },
                      }),
                    'sensor',
                    'sensor.heart_rate'
                  )}
                </div>
                <div class="form-field">
                  <label>Notifications Entity</label>
                  ${this._renderEntityInput(
                    this._config.status_bar.sources.notifications_entity || '',
                    (value) =>
                      this._updateConfig('status_bar', {
                        ...this._config.status_bar,
                        sources: {
                          ...this._config.status_bar.sources,
                          notifications_entity: value || null,
                        },
                      }),
                    'sensor',
                    'sensor.notifications'
                  )}
                </div>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  // ========== ADVANCED TAB ==========
  private _renderAdvancedTab(): TemplateResult {
    return html`
      <div class="form-section">
        <div class="form-section-title">Performance</div>

        <div class="toggle-row">
          <span class="toggle-label">Enable compression</span>
          <input
            type="checkbox"
            .checked=${this._config.advanced.compression}
            @change=${(e: Event) =>
              this._updateConfig('advanced', {
                ...this._config.advanced,
                compression: (e.target as HTMLInputElement).checked,
              })}
          />
        </div>

        <div class="form-row">
          <div class="form-field">
            <label>Min Update Interval (ms)</label>
            <input
              type="number"
              min="100"
              max="60000"
              .value=${String(this._config.advanced.min_update_interval_ms)}
              @input=${(e: Event) =>
                this._updateConfig('advanced', {
                  ...this._config.advanced,
                  min_update_interval_ms: parseInt((e.target as HTMLInputElement).value, 10) || 1000,
                })}
            />
          </div>
          <div class="form-field">
            <label>Full Refresh (minutes)</label>
            <input
              type="number"
              min="1"
              max="60"
              .value=${String(this._config.advanced.full_refresh_minutes)}
              @input=${(e: Event) =>
                this._updateConfig('advanced', {
                  ...this._config.advanced,
                  full_refresh_minutes: parseInt((e.target as HTMLInputElement).value, 10) || 15,
                })}
            />
          </div>
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-title">Debug</div>

        <div class="toggle-row">
          <span class="toggle-label">Show bounds overlay</span>
          <input
            type="checkbox"
            .checked=${this._config.advanced.debug.show_bounds}
            @change=${(e: Event) =>
              this._updateConfig('advanced', {
                ...this._config.advanced,
                debug: {
                  ...this._config.advanced.debug,
                  show_bounds: (e.target as HTMLInputElement).checked,
                },
              })}
          />
        </div>

        <div class="toggle-row">
          <span class="toggle-label">Show truncation markers</span>
          <input
            type="checkbox"
            .checked=${this._config.advanced.debug.show_truncation}
            @change=${(e: Event) =>
              this._updateConfig('advanced', {
                ...this._config.advanced,
                debug: {
                  ...this._config.advanced.debug,
                  show_truncation: (e.target as HTMLInputElement).checked,
                },
              })}
          />
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-title">Payload Info</div>
        <p style="font-size: 12px; color: var(--secondary-text-color)">
          Estimated size: ${this._watchLayout ? Math.round(estimatePayloadSize(this._watchLayout) / 1024 * 10) / 10 : 0} KB
        </p>
      </div>
    `;
  }

}

declare global {
  interface HTMLElementTagNameMap {
    [EDITOR_TAG]: InfinassistantWatchfaceEditor;
  }
}
