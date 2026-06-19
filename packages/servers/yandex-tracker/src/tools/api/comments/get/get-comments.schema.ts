/**
 * Zod схема для валидации параметров GetCommentsTool
 */

import { z } from 'zod';
import {
  IssueKeysSchema,
  ExpandSchema,
  FieldsSchema,
  CursorSchema,
  makePerPageSchema,
  FetchAllSchema,
  MaxItemsSchema,
  MaxTotalItemsSchema,
  noCursorWithBulkParams,
  cursorRequiresSingleIssue,
  PAGINATION_CURSOR_CONFLICT_MESSAGE,
  PAGINATION_CURSOR_BATCH_MESSAGE,
} from '#common/schemas/index.js';

/**
 * Схема параметров для получения комментариев
 */
export const GetCommentsParamsSchema = z
  .object({
    /**
     * Массив идентификаторов или ключей задач (обязательно)
     */
    issueIds: IssueKeysSchema.describe(
      "Array of issue IDs or keys (e.g., ['TEST-123', 'TEST-456'])"
    ),

    /**
     * Количество комментариев на странице (опционально)
     */
    perPage: makePerPageSchema(500),

    /**
     * Непрозрачный курсор следующей страницы (из pagination.nextCursor).
     * Допустим только при ровно одном issueId; несовместим с bulk-параметрами.
     */
    cursor: CursorSchema,

    /**
     * Opt-in полного обхода всех страниц (опционально)
     */
    fetchAll: FetchAllSchema,

    /**
     * Максимум комментариев на одну задачу при fetchAll=true (опционально)
     */
    maxItems: MaxItemsSchema,

    /** Общий потолок записей на весь batch-ответ при fetchAll=true (опционально) */
    maxTotalItems: MaxTotalItemsSchema,

    /**
     * Параметр expand для включения дополнительных данных (опционально)
     */
    expand: ExpandSchema,

    /**
     * Массив полей для возврата в результате (обязательный)
     * Примеры: ['id', 'text', 'createdAt'], ['id', 'text', 'createdBy.login']
     */
    fields: FieldsSchema,
  })
  .refine(noCursorWithBulkParams, {
    message: PAGINATION_CURSOR_CONFLICT_MESSAGE,
    path: ['cursor'],
  })
  .refine(cursorRequiresSingleIssue, {
    message: PAGINATION_CURSOR_BATCH_MESSAGE,
    path: ['cursor'],
  });

/**
 * Вывод типа из схемы
 */
export type GetCommentsParams = z.infer<typeof GetCommentsParamsSchema>;
