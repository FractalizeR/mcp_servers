import type { Issue, IssueWithUnknownFields } from '#tracker_api/entities/issue.entity.js';
import { createUserRef, createQueueRef } from './common-fixtures.js';

export function createIssueFixture(
  overrides?: Partial<Issue> & Record<string, unknown>
): IssueWithUnknownFields {
  const key = overrides?.key ?? 'TEST-1';
  return {
    id: '1',
    key,
    summary: 'Test Issue',
    queue: createQueueRef(),
    createdBy: createUserRef(),
    createdAt: '2024-01-01T00:00:00.000+0000',
    updatedAt: '2024-01-01T00:00:00.000+0000',
    ...overrides,
  };
}
