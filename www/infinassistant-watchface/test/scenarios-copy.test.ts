import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// test/data/scenarios.json is a copy of docs/face_dashboard/v8/scenarios.json of the main repository,
// which the dashboard preview tests read. In a checkout that holds only this repository the original
// does not exist and the comparison is skipped.
const original = new URL('../../../../docs/face_dashboard/v8/scenarios.json', import.meta.url);
const copy = new URL('./data/scenarios.json', import.meta.url);

describe.skipIf(!existsSync(original))('scenarios.json copy', () => {
  it('is byte-identical to docs/face_dashboard/v8/scenarios.json of the main repository', () => {
    expect(readFileSync(copy).equals(readFileSync(original))).toBe(true);
  });
});
