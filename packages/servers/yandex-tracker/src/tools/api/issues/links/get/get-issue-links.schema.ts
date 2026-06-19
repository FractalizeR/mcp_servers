/**
 * Zod схема для валидации параметров GetIssueLinksTool
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
 * Схема параметров для получения связей задач
 *
 * Параметры пагинации применяются ко всем задачам одинаково.
 */
export const GetIssueLinksParamsSchema = z
  .object({
    /**
     * Массив ключей или ID задач для получения связей
     */
    issueIds: IssueKeysSchema.describe('Array of issue IDs or keys'),

    /**
     * Массив полей для возврата в результате (обязательный)
     * Примеры: ['id', 'type', 'object'], ['id', 'type.id', 'object.key']
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
export type GetIssueLinksParams = z.infer<typeof GetIssueLinksParamsSchema>;
