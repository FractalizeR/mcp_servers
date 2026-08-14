// tests/helpers/search.fixture.ts
import type { SearchResponse } from '../../src/wiki_api/entities/index.js';

/**
 * Создать фикстуру для SearchResponse (пакет 7.2.C)
 */
export function createSearchResponseFixture(overrides?: Partial<SearchResponse>): SearchResponse {
  return {
    results: [
      {
        url: 'https://wiki.yandex.ru/users/testuser/found-page',
        slug: 'users/testuser/found-page',
        title: 'Found Page',
        content: 'This page matches the query...',
        type: 'page',
        modified_at: '2024-01-20T14:45:00.000Z',
      },
    ],
    next_cursor: 'next-cursor-abc',
    prev_cursor: 'prev-cursor-xyz',
    ...overrides,
  };
}
