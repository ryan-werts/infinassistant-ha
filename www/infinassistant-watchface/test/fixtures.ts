/**
 * Shared fixtures for the card's unit tests.
 */

import { DEFAULT_CONFIG, DEFAULT_TILE_CONFIG } from '../src/constants';
import type {
  CardConfig,
  DashboardConfig,
  HomeAssistant,
  TileConfig,
  ValidationMessage,
  ValidationResult,
} from '../src/types';

/** A fresh, independent copy of the card's default configuration. */
export function baseConfig(): CardConfig {
  return structuredClone(DEFAULT_CONFIG);
}

/** An enabled tile that passes validation, with optional overrides. */
export function validTile(overrides: Partial<TileConfig> = {}): TileConfig {
  return {
    ...structuredClone(DEFAULT_TILE_CONFIG),
    rules: [],
    enabled: true,
    label: 'Temp',
    type: 'sensor_value',
    entity: 'sensor.outside_temp',
    ...overrides,
  };
}

/** A dashboard with one valid status group and one valid sensor group. */
export function validDashboard(overrides: Partial<DashboardConfig> = {}): DashboardConfig {
  return {
    statusGroups: [{ type: 'doors', glyphs: [{ symbol: 'F', entity: 'binary_sensor.front_door' }] }],
    sensorGroups: [{ type: 'thermostats', sensors: [{ entity: 'sensor.living_room', displayType: 'temperature' }] }],
    ...overrides,
  };
}

/**
 * A minimal Home Assistant object whose state machine holds exactly the given
 * entity IDs. Only `states` is read by the pure modules under test.
 */
export function hassWith(...entityIds: string[]): HomeAssistant {
  const states: HomeAssistant['states'] = {};
  for (const entityId of entityIds) {
    states[entityId] = {
      entity_id: entityId,
      state: 'on',
      attributes: {},
      last_changed: '2026-01-01T00:00:00Z',
      last_updated: '2026-01-01T00:00:00Z',
    };
  }
  return { states } as unknown as HomeAssistant;
}

/** Fields of the messages of one severity, in the order they were reported. */
export function fieldsOf(
  result: ValidationResult,
  severity: ValidationMessage['severity']
): Array<string | undefined> {
  const list = severity === 'error' ? result.errors : severity === 'warning' ? result.warnings : result.info;
  return list.map((m) => m.field);
}
