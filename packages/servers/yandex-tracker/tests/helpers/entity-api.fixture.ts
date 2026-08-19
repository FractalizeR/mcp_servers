import type {
  EntityApiRecord,
  EntityApiRecordWithUnknownFields,
  KeyResultItem,
  KeyResultItemWithUnknownFields,
} from '#tracker_api/entities/entity-api.entity.js';
import { createUserRef } from './common-fixtures.js';

export function createEntityApiRecordFixture(
  overrides?: Partial<EntityApiRecord> & Record<string, unknown>
): EntityApiRecordWithUnknownFields {
  const id = overrides?.id ?? '1';
  const entityType = overrides?.entityType ?? 'goal';
  return {
    id,
    self: `https://api.tracker.yandex.net/v3/entities/${entityType}/${id}`,
    version: 1,
    shortId: 1,
    entityType,
    createdBy: createUserRef(),
    createdAt: '2024-01-01T00:00:00.000+0000',
    ...overrides,
  };
}

export function createKeyResultItemFixture(
  overrides?: Partial<KeyResultItem> & Record<string, unknown>
): KeyResultItemWithUnknownFields {
  return {
    id: 'kr1',
    type: 'binary',
    text: 'Ship X',
    ...overrides,
  };
}
