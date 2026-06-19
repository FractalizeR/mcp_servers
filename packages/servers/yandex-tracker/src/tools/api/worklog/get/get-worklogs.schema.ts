/**
 * Zod схема для валидации параметров GetWorklogsTool
 */

import { z } from 'zod';
import { IssueKeysSchema, FieldsSchema } from '#common/schemas/index.js';
import {
  CursorSchema,
  FetchAllSchema,
  MaxItemsSchema,
  MaxTotalItemsSchema,
  PerPageSchema,
  noCursorWithBulkParams,
  cursorRequiresSingleIssue,
  PAGINATION_CURSOR_CONFLICT_MESSAGE,
  PAGINATION_CURSOR_BATCH_MESSAGE,
} from '#common/schemas/index.js';

/**
 * Схема параметров для получения записей времени (batch режим)
 *
 * Параметры пагинации применяются ко всем задачам одинаково.
 */
export const GetWorklogsParamsSchema = z
  .object({
    /**
     * Массив идентификаторов или ключей задач (обязательно)
     */
    issueIds: IssueKeysSchema.describe(
      "Array of issue IDs or keys (e.g., ['TEST-123', 'TEST-456'])"
    ),

    /**
     * Поля, которые нужно вернуть (обязательно)
     */
    fields: FieldsSchema,

    /** Непрозрачный курсор следующей страницы (из pagination.nextCursor). */
    cursor: CursorSchema,

    /** Количество записей на странице. */
    perPage: PerPageSchema,

    /** Полный обход всех страниц по Link rel="next". */
    fetchAll: FetchAllSchema,

    /** Максимум записей на одну задачу при fetchAll=true. */
    maxItems: MaxItemsSchema,

    /** Общий потолок записей на весь batch-ответ при fetchAll=true (опционально) */
    maxTotalItems: MaxTotalItemsSchema,
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
export type GetWorklogsParams = z.infer<typeof GetWorklogsParamsSchema>;
