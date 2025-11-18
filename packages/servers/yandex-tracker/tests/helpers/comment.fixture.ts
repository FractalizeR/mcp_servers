/**
 * Фикстуры для Comment entity
 *
 * Используются в тестах для создания mock данных комментариев.
 */

import type {
  Comment,
  CommentWithUnknownFields,
  CommentAttachment,
} from '../../src/tracker_api/entities/comment/index.js';
import { createUserRef } from './common-fixtures.js';

/**
 * Создать CommentAttachment для тестов
 *
 * @example
 * ```typescript
 * const attachment = createCommentAttachmentFixture();
 * ```
 */
export function createCommentAttachmentFixture(
  overrides?: Partial<CommentAttachment>
): CommentAttachment {
  return {
    id: 'att12345',
    name: 'test-file.pdf',
    size: 1024,
    ...overrides,
  };
}

/**
 * Создать Comment для тестов
 *
 * @example
 * ```typescript
 * // Создать комментарий с дефолтными значениями
 * const comment = createCommentFixture();
 *
 * // Создать комментарий с кастомным текстом
 * const customComment = createCommentFixture({
 *   text: 'This is a custom comment',
 *   version: 2
 * });
 *
 * // Создать комментарий с attachments
 * const commentWithAttachments = createCommentFixture({
 *   attachments: [
 *     { id: 'att1', name: 'file.pdf', size: 1024 },
 *     { id: 'att2', name: 'image.png', size: 2048 }
 *   ]
 * });
 * ```
 */
export function createCommentFixture(overrides?: Partial<Comment>): CommentWithUnknownFields {
  const id = overrides?.id || '12345';
  const issueKey = 'TEST-123';

  return {
    id,
    self: `https://api.tracker.yandex.net/v2/issues/${issueKey}/comments/${id}`,
    text: 'Test comment text',
    createdBy: createUserRef(),
    createdAt: new Date('2025-01-18T10:00:00.000Z').toISOString(),
    version: 1,
    transport: 'internal',
    ...overrides,
  };
}

/**
 * Создать Comment с вложениями для тестов
 *
 * @example
 * ```typescript
 * const commentWithAttachments = createCommentWithAttachmentsFixture();
 * ```
 */
export function createCommentWithAttachmentsFixture(
  overrides?: Partial<Comment>
): CommentWithUnknownFields {
  return createCommentFixture({
    attachments: [
      { id: 'att1', name: 'file.pdf', size: 1024 },
      { id: 'att2', name: 'image.png', size: 2048 },
    ],
    ...overrides,
  });
}

/**
 * Создать отредактированный Comment для тестов
 *
 * @example
 * ```typescript
 * const editedComment = createEditedCommentFixture();
 * ```
 */
export function createEditedCommentFixture(overrides?: Partial<Comment>): CommentWithUnknownFields {
  const createdAt = new Date('2025-01-18T10:00:00.000Z').toISOString();
  const updatedAt = new Date('2025-01-18T12:00:00.000Z').toISOString();

  return createCommentFixture({
    updatedBy: createUserRef({ id: 'editor123', display: 'Editor User' }),
    updatedAt,
    version: 2,
    createdAt,
    ...overrides,
  });
}

/**
 * Создать массив Comments для тестов
 *
 * @example
 * ```typescript
 * const comments = createCommentListFixture(3);
 * // Вернёт массив из 3 комментариев с уникальными id
 * ```
 */
export function createCommentListFixture(
  count: number,
  baseOverrides?: Partial<Comment>
): CommentWithUnknownFields[] {
  return Array.from({ length: count }, (_, index) =>
    createCommentFixture({
      id: `${12345 + index}`,
      text: `Comment ${index + 1}`,
      ...baseOverrides,
    })
  );
}

/**
 * Создать Comment с минимальными обязательными полями
 * (полезно для negative testing)
 *
 * @example
 * ```typescript
 * const minimal = createMinimalCommentFixture();
 * ```
 */
export function createMinimalCommentFixture(id = '12345', issueKey = 'TEST-123'): Comment {
  return {
    id,
    self: `https://api.tracker.yandex.net/v2/issues/${issueKey}/comments/${id}`,
    text: 'Minimal comment',
    createdBy: createUserRef(),
    createdAt: new Date('2025-01-18T10:00:00.000Z').toISOString(),
  };
}

/**
 * Создать Comment отправленный через email
 *
 * @example
 * ```typescript
 * const emailComment = createEmailCommentFixture();
 * ```
 */
export function createEmailCommentFixture(overrides?: Partial<Comment>): CommentWithUnknownFields {
  return createCommentFixture({
    transport: 'email',
    ...overrides,
  });
}
