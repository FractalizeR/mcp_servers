/**
 * Фикстуры для Comment DTO (Input/Output)
 *
 * Используются в тестах для создания mock данных DTO комментариев.
 */

import type { AddCommentInput } from '../../src/tracker_api/dto/comment/add-comment.input.js';
import type { EditCommentInput } from '../../src/tracker_api/dto/comment/edit-comment.input.js';
import type { GetCommentsInput } from '../../src/tracker_api/dto/comment/get-comments.input.js';
import type {
  CommentOutput,
  CommentsListOutput,
} from '../../src/tracker_api/dto/comment/comment.output.js';
import { createCommentFixture, createCommentListFixture } from './comment.fixture.js';

/**
 * Создать AddCommentInput для тестов
 *
 * @example
 * ```typescript
 * // Создать базовый input
 * const input = createAddCommentInputFixture();
 *
 * // Создать input с attachments
 * const inputWithAttachments = createAddCommentInputFixture({
 *   attachmentIds: ['att1', 'att2']
 * });
 *
 * // Создать input с длинным текстом
 * const longInput = createAddCommentInputFixture({
 *   text: 'Very long comment text...'
 * });
 * ```
 */
export function createAddCommentInputFixture(
  overrides?: Partial<AddCommentInput>
): AddCommentInput {
  return {
    text: 'New test comment',
    attachmentIds: [],
    ...overrides,
  };
}

/**
 * Создать AddCommentInput с вложениями
 *
 * @example
 * ```typescript
 * const input = createAddCommentInputWithAttachmentsFixture();
 * ```
 */
export function createAddCommentInputWithAttachmentsFixture(
  overrides?: Partial<AddCommentInput>
): AddCommentInput {
  return createAddCommentInputFixture({
    attachmentIds: ['att12345', 'att67890'],
    ...overrides,
  });
}

/**
 * Создать EditCommentInput для тестов
 *
 * @example
 * ```typescript
 * const input = createEditCommentInputFixture();
 * const customInput = createEditCommentInputFixture({
 *   text: 'Updated comment text'
 * });
 * ```
 */
export function createEditCommentInputFixture(
  overrides?: Partial<EditCommentInput>
): EditCommentInput {
  return {
    text: 'Updated test comment',
    ...overrides,
  };
}

/**
 * Создать GetCommentsInput для тестов
 *
 * @example
 * ```typescript
 * // Базовые параметры
 * const input = createGetCommentsInputFixture();
 *
 * // С кастомной пагинацией
 * const paginatedInput = createGetCommentsInputFixture({
 *   perPage: 100,
 *   page: 2
 * });
 *
 * // С expand параметром
 * const expandedInput = createGetCommentsInputFixture({
 *   expand: 'attachments'
 * });
 * ```
 */
export function createGetCommentsInputFixture(
  overrides?: Partial<GetCommentsInput>
): GetCommentsInput {
  return {
    perPage: 50,
    page: 1,
    ...overrides,
  };
}

/**
 * Создать GetCommentsInput с expand параметром
 *
 * @example
 * ```typescript
 * const input = createGetCommentsInputWithExpandFixture();
 * ```
 */
export function createGetCommentsInputWithExpandFixture(
  overrides?: Partial<GetCommentsInput>
): GetCommentsInput {
  return createGetCommentsInputFixture({
    expand: 'attachments',
    ...overrides,
  });
}

/**
 * Создать CommentOutput для тестов
 *
 * @example
 * ```typescript
 * const output = createCommentOutputFixture();
 * const customOutput = createCommentOutputFixture({
 *   comment: createCommentFixture({ text: 'Custom comment' })
 * });
 * ```
 */
export function createCommentOutputFixture(overrides?: Partial<CommentOutput>): CommentOutput {
  return {
    comment: createCommentFixture(),
    ...overrides,
  };
}

/**
 * Создать CommentsListOutput для тестов
 *
 * @example
 * ```typescript
 * // Создать список из 3 комментариев
 * const output = createCommentsListOutputFixture(3);
 *
 * // Создать список с кастомным total
 * const outputWithTotal = createCommentsListOutputFixture(5, { total: 10 });
 * ```
 */
export function createCommentsListOutputFixture(
  count = 3,
  overrides?: Partial<CommentsListOutput>
): CommentsListOutput {
  return {
    comments: createCommentListFixture(count),
    total: count,
    ...overrides,
  };
}
