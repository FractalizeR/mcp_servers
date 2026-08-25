import type { Worklog, WorklogWithUnknownFields } from '#tracker_api/entities/worklog.entity.js';
import { createUserRef } from './common-fixtures.js';

export function createWorklogFixture(
  overrides?: Partial<Worklog> & Record<string, unknown>
): WorklogWithUnknownFields {
  const id = overrides?.id ?? 'wl1';
  return {
    id,
    self: `https://api.tracker.yandex.net/v3/issues/TEST-1/worklog/${id}`,
    issue: { id: '1', key: 'TEST-1', display: 'Test Issue' },
    createdBy: createUserRef(),
    createdAt: '2024-01-01T10:00:00.000+0000',
    start: '2024-01-01T10:00:00.000+0000',
    duration: 'PT1H',
    ...overrides,
  };
}
