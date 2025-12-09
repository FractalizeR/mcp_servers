// tests/helpers/resource.fixture.ts
import type { ResourcesResponse } from '../../src/wiki_api/entities/index.js';

/**
 * Создать фикстуру для ResourcesResponse
 */
export function createResourcesResponseFixture(
  overrides?: Partial<ResourcesResponse>
): ResourcesResponse {
  return {
    results: [
      {
        type: 'attachment',
        item: {
          name: 'document.pdf',
          size: 1024,
          created_at: '2024-01-15T10:30:00.000Z',
        },
      },
      {
        type: 'grid',
        item: {
          id: 'grid-123',
          title: 'Test Grid',
          created_at: '2024-01-16T11:00:00.000Z',
        },
      },
    ],
    next_cursor: 'next-cursor-abc',
    prev_cursor: 'prev-cursor-xyz',
    ...overrides,
  };
}
