import type {
  EntityApiRecord,
  EntityApiRecordWithUnknownFields,
  KeyResultItem,
  KeyResultItemWithUnknownFields,
} from '#tracker_api/entities/entity-api.entity.js';
import { createUserRef } from './common-fixtures.js';

export function createEntityApiRecordFixture(
  overrides?: Partial<EntityApiRecord>
): EntityApiRecordWithUnknownFields {
  const id = overrides?.id ?? '1';
  return {
    id,
    self: `https://api.tracker.yandex.net/v3/entities/goal/${id}`,
    version: 1,
    shortId: 1,
    entityType: 'goal',
    createdBy: createUserRef(),
    createdAt: '2024-01-01T00:00:00.000+0000',
    ...overrides,
  };
}

export function createKeyResultItemFixture(
  overrides?: Partial<KeyResultItem>
): KeyResultItemWithUnknownFields {
  return {
    id: 'kr1',
    type: 'binary',
    text: 'Ship X',
    ...overrides,
  };
}
