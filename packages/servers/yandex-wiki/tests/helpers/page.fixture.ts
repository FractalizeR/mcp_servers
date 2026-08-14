// tests/helpers/page.fixture.ts
import type {
  Page,
  PageWithUnknownFields,
  AsyncOperation,
  PageDescendantsResponse,
} from '../../src/wiki_api/entities/index.js';

/**
 * Создать фикстуру для Page
 */
export function createPageFixture(overrides?: Partial<Page>): PageWithUnknownFields {
  return {
    id: 12345,
    slug: 'users/testuser/test-page',
    title: 'Test Page Title',
    page_type: 'page',
    attributes: {
      created_at: '2024-01-15T10:30:00.000Z',
      modified_at: '2024-01-20T14:45:00.000Z',
      is_readonly: false,
      comments_count: 5,
      comments_enabled: true,
    },
    breadcrumbs: [
      { page_exists: true, slug: 'users', title: 'Users', id: 1 },
      { page_exists: true, slug: 'users/testuser', title: 'TestUser', id: 2 },
    ],
    ...overrides,
  };
}

/**
 * Создать фикстуру для AsyncOperation (clone result)
 */
export function createAsyncOperationFixture(overrides?: Partial<AsyncOperation>): AsyncOperation {
  return {
    operation: {
      type: 'clone',
      id: 'op-123456',
    },
    dry_run: false,
    status_url: 'https://api.wiki.yandex.net/v1/operations/op-123456',
    ...overrides,
  };
}

/**
 * Создать фикстуру для DeletePageResult
 */
export function createDeleteResultFixture(): { recovery_token: string } {
  return {
    recovery_token: 'recovery-token-abc123',
  };
}

/**
 * Создать фикстуру для PageDescendantsResponse (пакет 7.2.C)
 */
export function createDescendantsResponseFixture(
  overrides?: Partial<PageDescendantsResponse>
): PageDescendantsResponse {
  return {
    results: [
      { id: 1001, slug: 'users/testuser/section/child-1' },
      { id: 1002, slug: 'users/testuser/section/child-2' },
    ],
    next_cursor: 'next-cursor-abc',
    prev_cursor: 'prev-cursor-xyz',
    ...overrides,
  };
}
