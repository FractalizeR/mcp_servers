// tests/helpers/comment.fixture.ts
import type { CommentsResponse, Comment } from '../../src/wiki_api/entities/index.js';

/**
 * Создать фикстуру для одного Comment
 */
export function createCommentFixture(overrides?: Partial<Comment>): Comment {
  return {
    id: 501,
    body: 'Test comment body',
    author: {
      id: 'uid-1',
      username: 'testuser',
      display_name: 'Test User',
    },
    created_at: '2024-01-20T14:45:00.000Z',
    is_deleted: false,
    resolve_status: 'unresolved',
    ...overrides,
  };
}

/**
 * Создать фикстуру для CommentsResponse (пакет 7.2.D)
 */
export function createCommentsResponseFixture(
  overrides?: Partial<CommentsResponse>
): CommentsResponse {
  return {
    results: [
      createCommentFixture({ id: 501 }),
      createCommentFixture({ id: 502, body: 'Second comment' }),
    ],
    next_cursor: 'next-cursor-abc',
    prev_cursor: 'prev-cursor-xyz',
    ...overrides,
  };
}
