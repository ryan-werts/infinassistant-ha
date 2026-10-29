/**
 * Configuration Validator
 *
 * Implements schema and semantic validation for the card configuration.
 * Produces structured results with errors, warnings, and info messages.
 */

import type {
  CardConfig,
  ValidationResult,
  ValidationMessage,
  EditorTab,
  TileConfig,
  HomeAssistant,
  DashboardConfig,
} from './types';
import {
  MAX_EVENTS,
  MAX_PRESENCE_ICONS,
  MAX_SCREENS,
  MAX_SCREENS_LEGACY_FIRMWARE,
  TILE_TYPE_DOMAINS,
  DASHBOARD_MAX_STATUS_GROUPS,
  DASHBOARD_MIN_GLYPHS_PER_GROUP,
  DASHBOARD_MAX_GLYPHS_PER_GROUP,
  DASHBOARD_MAX_SENSOR_GROUPS,
  DASHBOARD_MAX_SENSORS_PER_GROUP,
  DASHBOARD_STATUS_GROUP_TYPES,
  DASHBOARD_SENSOR_GROUP_TYPES,
  DASHBOARD_GLYPH_DOMAINS,
  DASHBOARD_SENSOR_DOMAINS,
  EDITOR_TABS,
} from './constants';
import { isValidGlyph, isValidPresenceGlyph } from './glyph-registry';
import { glyphSymbolProblem } from './watch-layout-exporter';

/**
 * Create a validation message
 */
function createMessage(
  severity: ValidationMessage['severity'],
  message: string,
  tab: EditorTab,
  field?: string
): ValidationMessage {
  return { severity, message, tab, field };
}

/**
 * Check if a string is a valid entity ID format
 */
function isValidEntityFormat(entityId: string): boolean {
  return /^[a-z0-9_-]+\.[a-z0-9_-]+$/.test(entityId);
}

/**
 * Get the domain from an entity ID
 */
function getDomain(entityId: string): string {
  return entityId.split('.')[0];
}

/**
 * Check if an entity exists in Home Assistant
 */
function entityExists(hass: HomeAssistant | undefined, entityId: string): boolean {
  return !!hass?.states[entityId];
}

/**
 * Check if entity domain is compatible with expected domains
 */
function isDomainCompatible(entityId: string, allowedDomains: string[]): boolean {
  const domain = getDomain(entityId);
  return allowedDomains.includes(domain);
}

/**
 * Validate the settings configuration (header, status bar, advanced, layout/theme)
 */
function validateSettings(
  config: CardConfig,
  hass: HomeAssistant | undefined,
  messages: ValidationMessage[]
): void {
  // Validate theme preset
  if (!['charcoal', 'black'].includes(config.theme.preset)) {
    messages.push(createMessage('error', 'Invalid theme preset.', 'settings', 'theme.preset'));
  }

  // Validate accent color format (if provided)
  if (config.theme.accent) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(config.theme.accent)) {
      messages.push(createMessage('error', 'Invalid accent color format. Use #RRGGBB.', 'settings', 'theme.accent'));
    }
  }

  // Validate version
  if (config.version !== 1 && config.version !== 2) {
    messages.push(createMessage('error', 'Unsupported config version. Use 1 or 2.', 'settings', 'version'));
  }

  // Validate time format
  if (!['HH:mm', 'hh:mm'].includes(config.header.time.format)) {
    messages.push(createMessage('error', 'Invalid time format. Must be HH:mm or hh:mm.', 'settings', 'time.format'));
  }

  // Validate time alignment
  if (!['left', 'center', 'right'].includes(config.header.time.align)) {
    messages.push(createMessage('error', 'Invalid time alignment.', 'settings', 'time.align'));
  }

  // Validate presence configuration
  if (config.header.presence.enabled) {
    if (!config.header.presence.home_zone) {
      messages.push(createMessage('error', 'Home zone entity is required.', 'settings', 'presence.home_zone'));
    } else if (!isValidEntityFormat(config.header.presence.home_zone)) {
      messages.push(createMessage('error', 'Invalid home zone entity format.', 'settings', 'presence.home_zone'));
    } else if (hass && !entityExists(hass, config.header.presence.home_zone)) {
      messages.push(createMessage('warning', `Home zone entity "${config.header.presence.home_zone}" not found.`, 'settings', 'presence.home_zone'));
    }

    if (!/^\d+:\d{2}:\d{2}$/.test(config.header.presence.long_away_threshold)) {
      messages.push(createMessage('error', 'Invalid long-away threshold format. Use HH:mm:ss.', 'settings', 'presence.long_away_threshold'));
    }

    if (config.header.presence.icons.length > MAX_PRESENCE_ICONS) {
      messages.push(createMessage('error', `Maximum ${MAX_PRESENCE_ICONS} presence icons allowed.`, 'settings', 'presence.icons'));
    }

    config.header.presence.icons.forEach((icon, index) => {
      if (!isValidPresenceGlyph(icon.icon)) {
        messages.push(createMessage('error', `Invalid presence icon type at position ${index + 1}.`, 'settings', `presence.icons[${index}].icon`));
      }

      if (!icon.entity) {
        messages.push(createMessage('error', `Entity required for presence icon ${index + 1}.`, 'settings', `presence.icons[${index}].entity`));
      } else if (!isValidEntityFormat(icon.entity)) {
        messages.push(createMessage('error', `Invalid entity format for presence icon ${index + 1}.`, 'settings', `presence.icons[${index}].entity`));
      } else {
        const domain = getDomain(icon.entity);
        if (!['person', 'device_tracker'].includes(domain)) {
          messages.push(createMessage('warning', `Presence icon ${index + 1} entity should be person.* or device_tracker.*.`, 'settings', `presence.icons[${index}].entity`));
        }
        if (hass && !entityExists(hass, icon.entity)) {
          messages.push(createMessage('warning', `Presence icon entity "${icon.entity}" not found.`, 'settings', `presence.icons[${index}].entity`));
        }
      }
    });
  }

  // Validate status bar
  const { status_bar } = config;
  if (status_bar.enabled && status_bar.sources) {
    const sources = status_bar.sources;

    if (sources.steps_entity) {
      if (!isValidEntityFormat(sources.steps_entity)) {
        messages.push(createMessage('error', 'Invalid steps entity format.', 'settings', 'sources.steps_entity'));
      } else if (hass && !entityExists(hass, sources.steps_entity)) {
        messages.push(createMessage('warning', `Steps entity "${sources.steps_entity}" not found.`, 'settings', 'sources.steps_entity'));
      }
    }

    if (sources.hr_entity) {
      if (!isValidEntityFormat(sources.hr_entity)) {
        messages.push(createMessage('error', 'Invalid heart rate entity format.', 'settings', 'sources.hr_entity'));
      } else if (hass && !entityExists(hass, sources.hr_entity)) {
        messages.push(createMessage('warning', `Heart rate entity "${sources.hr_entity}" not found.`, 'settings', 'sources.hr_entity'));
      }
    }

    if (sources.notifications_entity) {
      if (!isValidEntityFormat(sources.notifications_entity)) {
        messages.push(createMessage('error', 'Invalid notifications entity format.', 'settings', 'sources.notifications_entity'));
      } else if (hass && !entityExists(hass, sources.notifications_entity)) {
        messages.push(createMessage('warning', `Notifications entity "${sources.notifications_entity}" not found.`, 'settings', 'sources.notifications_entity'));
      }
    }

    const anyEnabled = status_bar.battery || status_bar.bluetooth || status_bar.steps || status_bar.heart_rate || status_bar.notifications;
    if (!anyEnabled) {
      messages.push(createMessage('info', 'Status bar enabled but no indicators selected.', 'settings'));
    }
  }

  // Validate advanced
  const { advanced } = config;
  if (advanced.min_update_interval_ms < 100) {
    messages.push(createMessage('warning', 'Very short update interval may cause performance issues.', 'settings', 'min_update_interval_ms'));
  }
  if (advanced.min_update_interval_ms > 60000) {
    messages.push(createMessage('info', 'Long update interval may cause stale data.', 'settings', 'min_update_interval_ms'));
  }
  if (advanced.full_refresh_minutes < 1) {
    messages.push(createMessage('warning', 'Very short full refresh interval may cause excessive load.', 'settings', 'full_refresh_minutes'));
  }
  if (advanced.full_refresh_minutes > 60) {
    messages.push(createMessage('info', 'Long full refresh interval may cause stale data.', 'settings', 'full_refresh_minutes'));
  }
}

/**
 * Validate the calendar (events) configuration
 */
function validateCalendar(
  config: CardConfig,
  hass: HomeAssistant | undefined,
  messages: ValidationMessage[]
): void {
  const { events } = config;

  if (events.enabled) {
    if (!events.calendars || events.calendars.length === 0) {
      messages.push(createMessage('error', 'At least one calendar is required when events are enabled.', 'calendar', 'calendars'));
    } else {
      events.calendars.forEach((cal, index) => {
        if (!isValidEntityFormat(cal)) {
          messages.push(createMessage('error', `Invalid calendar entity format at position ${index + 1}.`, 'calendar', `calendars[${index}]`));
        } else if (getDomain(cal) !== 'calendar') {
          messages.push(createMessage('error', `Entity "${cal}" is not a calendar.`, 'calendar', `calendars[${index}]`));
        } else if (hass && !entityExists(hass, cal)) {
          messages.push(createMessage('warning', `Calendar entity "${cal}" not found.`, 'calendar', `calendars[${index}]`));
        }
      });
    }

    if (events.max_events < 0 || events.max_events > MAX_EVENTS) {
      messages.push(createMessage('error', `Max events must be between 0 and ${MAX_EVENTS}.`, 'calendar', 'max_events'));
    }

    if (!/^\d+:\d{2}:\d{2}$/.test(events.soon_window)) {
      messages.push(createMessage('error', 'Invalid soon window format. Use HH:mm:ss.', 'calendar', 'soon_window'));
    }

    if (!['show_all_day', 'hide', 'banner'].includes(events.all_day)) {
      messages.push(createMessage('error', 'Invalid all-day handling option.', 'calendar', 'all_day'));
    }
  }
}

/**
 * Validate a single tile configuration
 */
function validateTile(
  tile: TileConfig,
  index: number,
  hass: HomeAssistant | undefined,
  messages: ValidationMessage[]
): void {
  if (!tile.enabled) return;

  const position = index + 1;

  if (!tile.label || tile.label.trim() === '') {
    messages.push(createMessage('error', `Tile ${position} requires a label.`, 'screens', `tiles[${index}].label`));
  } else if (tile.label.length > 8) {
    messages.push(createMessage('warning', `Tile ${position} label may be truncated (max 8 chars).`, 'screens', `tiles[${index}].label`));
  }

  if (tile.displayMode !== 'text' && !isValidGlyph(tile.icon)) {
    messages.push(createMessage('error', `Invalid icon for tile ${position}.`, 'screens', `tiles[${index}].icon`));
  }

  const validTypes = ['count', 'duration', 'state_text', 'cover_state', 'media_count', 'sensor_value'];
  if (!validTypes.includes(tile.type)) {
    messages.push(createMessage('error', `Invalid type for tile ${position}.`, 'screens', `tiles[${index}].type`));
  }

  if (!tile.entity && !tile.device_id) {
    messages.push(createMessage('error', `Tile ${position} requires an entity or device.`, 'screens', `tiles[${index}].entity`));
  } else if (tile.entity) {
    if (!isValidEntityFormat(tile.entity)) {
      messages.push(createMessage('error', `Invalid entity format for tile ${position}.`, 'screens', `tiles[${index}].entity`));
    } else {
      const allowedDomains = TILE_TYPE_DOMAINS[tile.type];
      if (allowedDomains && !isDomainCompatible(tile.entity, allowedDomains)) {
        messages.push(createMessage('warning', `Tile ${position} entity domain may not be compatible with type "${tile.type}".`, 'screens', `tiles[${index}].entity`));
      }
      if (hass && !entityExists(hass, tile.entity)) {
        messages.push(createMessage('warning', `Tile ${position} entity "${tile.entity}" not found.`, 'screens', `tiles[${index}].entity`));
      }
    }
  }

  if (!['auto', 'manual', 'disabled'].includes(tile.color)) {
    messages.push(createMessage('error', `Invalid color mode for tile ${position}.`, 'screens', `tiles[${index}].color`));
  }

  if (tile.color !== 'disabled' && tile.rules) {
    tile.rules.forEach((rule, ruleIndex) => {
      if (!rule.condition) {
        messages.push(createMessage('error', `Rule ${ruleIndex + 1} for tile ${position} missing condition.`, 'screens', `tiles[${index}].rules[${ruleIndex}].condition`));
      }
      const validColors = ['green', 'yellow', 'red', 'gray', 'accent', 'white'];
      if (!validColors.includes(rule.color)) {
        messages.push(createMessage('error', `Invalid color in rule ${ruleIndex + 1} for tile ${position}.`, 'screens', `tiles[${index}].rules[${ruleIndex}].color`));
      }
    });
  }

  if (!['none', 'toggle', 'more-info', 'service'].includes(tile.tap)) {
    messages.push(createMessage('error', `Invalid tap action for tile ${position}.`, 'screens', `tiles[${index}].tap`));
  }
}

/**
 * Validate dashboard-specific configuration (FR-19, FR-20, FR-21, FR-22).
 *
 * Structure checks are synchronous (<50ms per NFR-7). Entity existence checks
 * use the hass.states lookup which is already in-memory — no network I/O.
 * If hass is undefined the existence check is skipped with an "unable to verify" warning.
 */
function validateDashboard(
  dashboard: DashboardConfig,
  screenIndex: number,
  hass: HomeAssistant | undefined,
  messages: ValidationMessage[]
): void {
  const prefix = `Screen ${screenIndex + 1}`;
  const fieldPrefix = `screens[${screenIndex}].dashboard`;

  const statusGroups = dashboard.statusGroups || [];
  const sensorGroups = dashboard.sensorGroups || [];
  const hasWeather = !!dashboard.weather?.entity;

  // FR-20: warn when dashboard is completely empty
  if (statusGroups.length === 0 && sensorGroups.length === 0 && !hasWeather) {
    messages.push(createMessage(
      'warning',
      `${prefix}: dashboard has no status groups, sensor groups, or weather configured.`,
      'screens',
      `${fieldPrefix}`
    ));
  }

  // FR-19: status group count
  if (statusGroups.length > DASHBOARD_MAX_STATUS_GROUPS) {
    messages.push(createMessage(
      'error',
      `${prefix}: maximum ${DASHBOARD_MAX_STATUS_GROUPS} status groups allowed (found ${statusGroups.length}).`,
      'screens',
      `${fieldPrefix}.statusGroups`
    ));
  }

  statusGroups.forEach((group, gi) => {
    const groupField = `${fieldPrefix}.statusGroups[${gi}]`;

    // FR-19: status group type
    if (!(DASHBOARD_STATUS_GROUP_TYPES as readonly string[]).includes(group.type)) {
      messages.push(createMessage(
        'error',
        `${prefix}: status group ${gi + 1} has invalid type "${group.type}". Must be one of: ${DASHBOARD_STATUS_GROUP_TYPES.join(', ')}.`,
        'screens',
        `${groupField}.type`
      ));
    }

    const glyphs = group.glyphs || [];

    // FR-19: min glyphs per group
    if (glyphs.length < DASHBOARD_MIN_GLYPHS_PER_GROUP) {
      messages.push(createMessage(
        'error',
        `${prefix}: status group ${gi + 1} must have at least ${DASHBOARD_MIN_GLYPHS_PER_GROUP} glyph.`,
        'screens',
        `${groupField}.glyphs`
      ));
    }

    // FR-19: max glyphs per group
    if (glyphs.length > DASHBOARD_MAX_GLYPHS_PER_GROUP) {
      messages.push(createMessage(
        'error',
        `${prefix}: status group ${gi + 1} has ${glyphs.length} glyphs (max ${DASHBOARD_MAX_GLYPHS_PER_GROUP}).`,
        'screens',
        `${groupField}.glyphs`
      ));
    }

    // FR-21: validate glyph entity domain (synchronous format check)
    glyphs.forEach((glyph, gIdx) => {
      const glyphField = `${groupField}.glyphs[${gIdx}]`;
      // FR-26: a symbol the watch shows as "?" or not at all, which it does without a word.
      const symbolProblem = glyphSymbolProblem(glyph.symbol);
      if (symbolProblem) {
        messages.push(createMessage(
          'warning',
          `${prefix}: status group ${gi + 1}, glyph ${gIdx + 1}: ${symbolProblem}.`,
          'screens',
          `${glyphField}.symbol`
        ));
      }
      if (!glyph.entity) {
        messages.push(createMessage(
          'error',
          `${prefix}: status group ${gi + 1}, glyph ${gIdx + 1} has no entity.`,
          'screens',
          `${glyphField}.entity`
        ));
        return;
      }
      if (!isValidEntityFormat(glyph.entity)) {
        messages.push(createMessage(
          'error',
          `${prefix}: status group ${gi + 1}, glyph ${gIdx + 1} has invalid entity format "${glyph.entity}".`,
          'screens',
          `${glyphField}.entity`
        ));
        return;
      }
      const domain = getDomain(glyph.entity);
      if (!(DASHBOARD_GLYPH_DOMAINS as readonly string[]).includes(domain)) {
        messages.push(createMessage(
          'error',
          `${prefix}: glyph entity "${glyph.entity}" has domain "${domain}". Must be one of: ${DASHBOARD_GLYPH_DOMAINS.join(', ')}.`,
          'screens',
          `${glyphField}.entity`
        ));
        return;
      }
      // Async-style existence check — hass.states is in-memory so this is synchronous in practice.
      // If hass is not available, we cannot verify.
      if (!hass) {
        messages.push(createMessage(
          'warning',
          `${prefix}: unable to verify glyph entity "${glyph.entity}" — HA connection not available.`,
          'screens',
          `${glyphField}.entity`
        ));
      } else if (!entityExists(hass, glyph.entity)) {
        messages.push(createMessage(
          'warning',
          `${prefix}: glyph entity "${glyph.entity}" not found in Home Assistant.`,
          'screens',
          `${glyphField}.entity`
        ));
      }
    });
  });

  // FR-19: sensor group count
  if (sensorGroups.length > DASHBOARD_MAX_SENSOR_GROUPS) {
    messages.push(createMessage(
      'error',
      `${prefix}: maximum ${DASHBOARD_MAX_SENSOR_GROUPS} sensor groups allowed (found ${sensorGroups.length}).`,
      'screens',
      `${fieldPrefix}.sensorGroups`
    ));
  }

  sensorGroups.forEach((group, gi) => {
    const groupField = `${fieldPrefix}.sensorGroups[${gi}]`;

    // FR-19: sensor group type
    if (!(DASHBOARD_SENSOR_GROUP_TYPES as readonly string[]).includes(group.type)) {
      messages.push(createMessage(
        'error',
        `${prefix}: sensor group ${gi + 1} has invalid type "${group.type}". Must be one of: ${DASHBOARD_SENSOR_GROUP_TYPES.join(', ')}.`,
        'screens',
        `${groupField}.type`
      ));
    }

    const sensors = group.sensors || [];

    // FR-19: max sensors per group
    if (sensors.length > DASHBOARD_MAX_SENSORS_PER_GROUP) {
      messages.push(createMessage(
        'error',
        `${prefix}: sensor group ${gi + 1} has ${sensors.length} sensors (max ${DASHBOARD_MAX_SENSORS_PER_GROUP}).`,
        'screens',
        `${groupField}.sensors`
      ));
    }

    // FR-22: validate sensor entity domain (synchronous format check)
    sensors.forEach((sensor, sIdx) => {
      const sensorField = `${groupField}.sensors[${sIdx}]`;
      if (!sensor.entity) {
        messages.push(createMessage(
          'error',
          `${prefix}: sensor group ${gi + 1}, sensor ${sIdx + 1} has no entity.`,
          'screens',
          `${sensorField}.entity`
        ));
        return;
      }
      if (!isValidEntityFormat(sensor.entity)) {
        messages.push(createMessage(
          'error',
          `${prefix}: sensor group ${gi + 1}, sensor ${sIdx + 1} has invalid entity format "${sensor.entity}".`,
          'screens',
          `${sensorField}.entity`
        ));
        return;
      }
      const domain = getDomain(sensor.entity);
      if (!(DASHBOARD_SENSOR_DOMAINS as readonly string[]).includes(domain)) {
        messages.push(createMessage(
          'error',
          `${prefix}: sensor entity "${sensor.entity}" has domain "${domain}". Must be one of: ${DASHBOARD_SENSOR_DOMAINS.join(', ')}.`,
          'screens',
          `${sensorField}.entity`
        ));
        return;
      }
      if (!hass) {
        messages.push(createMessage(
          'warning',
          `${prefix}: unable to verify sensor entity "${sensor.entity}" — HA connection not available.`,
          'screens',
          `${sensorField}.entity`
        ));
      } else if (!entityExists(hass, sensor.entity)) {
        messages.push(createMessage(
          'warning',
          `${prefix}: sensor entity "${sensor.entity}" not found in Home Assistant.`,
          'screens',
          `${sensorField}.entity`
        ));
      }
    });
  });

  // FR-19: weather entity domain
  if (hasWeather) {
    const weatherEntity = dashboard.weather!.entity;
    if (!isValidEntityFormat(weatherEntity)) {
      messages.push(createMessage(
        'error',
        `${prefix}: weather entity "${weatherEntity}" has invalid format.`,
        'screens',
        `${fieldPrefix}.weather.entity`
      ));
    } else if (getDomain(weatherEntity) !== 'weather') {
      messages.push(createMessage(
        'error',
        `${prefix}: weather entity "${weatherEntity}" must be in the weather.* domain.`,
        'screens',
        `${fieldPrefix}.weather.entity`
      ));
    } else if (!hass) {
      messages.push(createMessage(
        'warning',
        `${prefix}: unable to verify weather entity "${weatherEntity}" — HA connection not available.`,
        'screens',
        `${fieldPrefix}.weather.entity`
      ));
    } else if (!entityExists(hass, weatherEntity)) {
      messages.push(createMessage(
        'warning',
        `${prefix}: weather entity "${weatherEntity}" not found in Home Assistant.`,
        'screens',
        `${fieldPrefix}.weather.entity`
      ));
    }
  }

  // The dashboard's own calendars; with none, it reads every calendar on the Calendar tab.
  // YAML can make events anything, and the exporter and the editor take only a list.
  const events: unknown = dashboard.events;
  if (events != null && !Array.isArray(events)) {
    messages.push(createMessage(
      'error',
      `${prefix}: events must be a list of calendars, such as [{ calendar: calendar.home }].`,
      'screens',
      `${fieldPrefix}.events`
    ));
  }
  (Array.isArray(events) ? events : []).forEach((event, i) => {
    const field = `${fieldPrefix}.events[${i}].calendar`;
    const calendar = event?.calendar ?? '';
    if (!isValidEntityFormat(calendar) || getDomain(calendar) !== 'calendar') {
      messages.push(createMessage('error', `${prefix}: calendar ${i + 1} ("${calendar}") is not a calendar entity.`, 'screens', field));
    } else if (!hass) {
      messages.push(createMessage('warning', `${prefix}: unable to verify calendar "${calendar}" — HA connection not available.`, 'screens', field));
    } else if (!entityExists(hass, calendar)) {
      messages.push(createMessage('warning', `${prefix}: calendar "${calendar}" not found in Home Assistant.`, 'screens', field));
    }
  });

  // FR-22: configurable headline value
  if (dashboard.configurableValue) {
    const cv = dashboard.configurableValue;
    if (!cv.entity) {
      messages.push(createMessage(
        'error',
        `${prefix}: configurable value has no entity.`,
        'screens',
        `${fieldPrefix}.configurableValue.entity`
      ));
    } else if (!isValidEntityFormat(cv.entity)) {
      messages.push(createMessage(
        'error',
        `${prefix}: configurable value entity "${cv.entity}" has invalid format.`,
        'screens',
        `${fieldPrefix}.configurableValue.entity`
      ));
    } else if (hass && !entityExists(hass, cv.entity)) {
      messages.push(createMessage(
        'warning',
        `${prefix}: configurable value entity "${cv.entity}" not found in Home Assistant.`,
        'screens',
        `${fieldPrefix}.configurableValue.entity`
      ));
    }
    if (cv.label && cv.label.length > 11) {
      messages.push(createMessage(
        'warning',
        `${prefix}: configurable value label "${cv.label}" exceeds 11 characters and will be truncated.`,
        'screens',
        `${fieldPrefix}.configurableValue.label`
      ));
    }
  }

  // FR-22: inline metric slots
  const inlineMetrics = dashboard.inlineMetrics || [];
  inlineMetrics.forEach((metric, slotIndex) => {
    if (!metric) return;
    const slotField = `${fieldPrefix}.inlineMetrics[${slotIndex}]`;
    if (!metric.entity) {
      messages.push(createMessage(
        'error',
        `${prefix}: inline metric slot ${slotIndex + 1} has no entity.`,
        'screens',
        `${slotField}.entity`
      ));
    } else if (!isValidEntityFormat(metric.entity)) {
      messages.push(createMessage(
        'error',
        `${prefix}: inline metric slot ${slotIndex + 1} entity "${metric.entity}" has invalid format.`,
        'screens',
        `${slotField}.entity`
      ));
    } else if (hass && !entityExists(hass, metric.entity)) {
      messages.push(createMessage(
        'warning',
        `${prefix}: inline metric slot ${slotIndex + 1} entity "${metric.entity}" not found in Home Assistant.`,
        'screens',
        `${slotField}.entity`
      ));
    }
    if (metric.label && metric.label.length > 2) {
      messages.push(createMessage(
        'warning',
        `${prefix}: inline metric slot ${slotIndex + 1} label "${metric.label}" exceeds 2 characters and will be truncated.`,
        'screens',
        `${slotField}.label`
      ));
    }
  });
}

/**
 * Validate screens configuration
 */
function validateScreens(
  config: CardConfig,
  hass: HomeAssistant | undefined,
  messages: ValidationMessage[]
): void {
  const screens = config.screens || [];

  if (screens.length > MAX_SCREENS) {
    messages.push(createMessage('error', `Maximum ${MAX_SCREENS} screens allowed.`, 'screens', 'screens'));
  } else if (screens.length > MAX_SCREENS_LEGACY_FIRMWARE) {
    messages.push(createMessage(
      'info',
      `More than ${MAX_SCREENS_LEGACY_FIRMWARE} screens needs watch firmware 2.4.100 or later; older firmware shows only the first ${MAX_SCREENS_LEGACY_FIRMWARE}.`,
      'screens',
      'screens'
    ));
  }

  screens.forEach((screen, screenIndex) => {
    const validScreenTypes = ['dashboard', 'tiles'];
    if (!validScreenTypes.includes(screen.screenType)) {
      messages.push(createMessage('error', `Screen ${screenIndex}: invalid screen type "${screen.screenType}". Only dashboard and tiles are allowed.`, 'screens', `screens[${screenIndex}].screenType`));
    }

    if (screen.screenType === 'dashboard' && !screen.dashboard) {
      messages.push(createMessage('warning', `Screen ${screenIndex + 1}: dashboard screen has no dashboard configuration.`, 'screens', `screens[${screenIndex}].dashboard`));
    }

    if (screen.screenType === 'dashboard' && screen.dashboard) {
      validateDashboard(screen.dashboard, screenIndex, hass, messages);
    }

    if (screen.screenType === 'tiles' && screen.tiles) {
      if (screen.tiles.length > 4) {
        messages.push(createMessage('error', `Screen ${screenIndex + 1}: maximum 4 tiles allowed per screen.`, 'screens', `screens[${screenIndex}].tiles`));
      }
      screen.tiles.forEach((tile, tileIndex) => {
        validateTile(tile, tileIndex, hass, messages);
      });
    }
  });

  // Also validate legacy tiles array
  if (config.tiles && config.tiles.length > 0) {
    const enabledTiles = config.tiles.filter((t) => t.enabled).length;
    if (enabledTiles === 0) {
      messages.push(createMessage('info', 'No legacy tiles are enabled.', 'screens'));
    }
    config.tiles.forEach((tile, index) => {
      validateTile(tile, index, hass, messages);
    });
  }
}

/**
 * Validate logbook app configuration
 */
function validateLogbook(
  config: CardConfig,
  messages: ValidationMessage[]
): void {
  if (!config.logbook_app) return;

  if (config.logbook_app.hours_back < 1 || config.logbook_app.hours_back > 48) {
    messages.push(createMessage('error', 'Hours back must be 1–48', 'logbook', 'hours_back'));
  }
  if (config.logbook_app.max_entries < 1 || config.logbook_app.max_entries > 15) {
    messages.push(createMessage('error', 'Max entries must be 1–15', 'logbook', 'max_entries'));
  }
  config.logbook_app.entities.forEach((e, i) => {
    if (!e || e.trim() === '') {
      messages.push(createMessage('warning', `Logbook entity ${i + 1} is empty`, 'logbook', `entities[${i}]`));
    }
  });
}

/**
 * Validate home control configuration
 */
function validateHomeControl(
  config: CardConfig,
  messages: ValidationMessage[]
): void {
  if (!config.home_control) return;

  if (config.home_control.devices.length > 4) {
    messages.push(createMessage('error', 'Maximum 4 home control devices', 'home_control', 'devices'));
  }
  config.home_control.devices.forEach((dev, i) => {
    if (!dev.entity_id || dev.entity_id.trim() === '') {
      messages.push(createMessage('warning', `Home control device ${i + 1} has no entity`, 'home_control', `devices[${i}].entity_id`));
    }
  });
}

/**
 * Group messages by tab
 */
function groupByTab(messages: ValidationMessage[]): Record<EditorTab, ValidationMessage[]> {
  const tabs: EditorTab[] = ['settings', 'screens', 'calendar', 'logbook', 'home_control'];
  const result = {} as Record<EditorTab, ValidationMessage[]>;
  for (const tab of tabs) {
    result[tab] = [];
  }

  for (const msg of messages) {
    if (tabs.includes(msg.tab)) {
      result[msg.tab].push(msg);
    }
  }

  return result;
}

/**
 * Validate the complete card configuration
 */
export function validateConfig(
  config: CardConfig,
  hass?: HomeAssistant
): ValidationResult {
  const messages: ValidationMessage[] = [];

  validateSettings(config, hass, messages);
  validateCalendar(config, hass, messages);
  validateScreens(config, hass, messages);
  validateLogbook(config, messages);
  validateHomeControl(config, messages);

  const errors = messages.filter((m) => m.severity === 'error');
  const warnings = messages.filter((m) => m.severity === 'warning');
  const info = messages.filter((m) => m.severity === 'info');

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info,
    byTab: groupByTab(messages),
  };
}

/**
 * Get validation badge counts for each tab
 */
export function getTabBadgeCounts(
  result: ValidationResult
): Record<EditorTab, { errors: number; warnings: number }> {
  const tabs: EditorTab[] = ['settings', 'screens', 'calendar', 'logbook', 'home_control'];
  const counts = {} as Record<EditorTab, { errors: number; warnings: number }>;
  for (const tab of tabs) {
    counts[tab] = { errors: 0, warnings: 0 };
  }

  for (const tab of tabs) {
    const tabMessages = result.byTab[tab] || [];
    counts[tab].errors = tabMessages.filter((m) => m.severity === 'error').length;
    counts[tab].warnings = tabMessages.filter((m) => m.severity === 'warning').length;
  }

  return counts;
}

/**
 * Check if config is publishable (no errors)
 */
export function isPublishable(result: ValidationResult): boolean {
  return result.valid;
}

/** A message as the card's banner lists it, with the name of the editor tab it is on. */
export interface ListedMessage extends ValidationMessage {
  tabLabel: string;
}

/** What the card's banner lists when tapped: the errors, then the warnings. */
export function listedMessages(result: ValidationResult | null): ListedMessage[] {
  if (!result) return [];
  return [...result.errors, ...result.warnings].map((m) => ({
    ...m,
    tabLabel: EDITOR_TABS.find((t) => t.id === m.tab)?.label ?? m.tab,
  }));
}
