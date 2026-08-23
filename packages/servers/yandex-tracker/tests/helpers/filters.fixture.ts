/**
 * Фикстуры для SavedFilter entity (`tests/integration/tools/api/filters/`).
 */

import type { SavedFilter, SavedFilterWithUnknownFields } from '#tracker_api/entities/index.js';

export function createFilterFixture(
  overrides?: Partial<SavedFilter> & Record<string, unknown>
): SavedFilterWithUnknownFields {
  const id = overrides?.id ?? '1';
  return {
    id,
    self: `https://api.tracker.yandex.net/v3/filters/${id}`,
    name: 'Test Filter',
    ...overrides,
  };
}
