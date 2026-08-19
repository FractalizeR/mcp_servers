import type {
  BulkChangeOperation,
  BulkChangeOperationWithUnknownFields,
} from '#tracker_api/entities/bulk-change.entity.js';

export function createBulkChangeOperationFixture(
  overrides?: Partial<BulkChangeOperation> & Record<string, unknown>
): BulkChangeOperationWithUnknownFields {
  const id = overrides?.id ?? 'bulk-1';
  return {
    id,
    self: `https://api.tracker.yandex.net/v2/bulkchange/${id}`,
    status: 'COMPLETED',
    ...overrides,
  };
}
