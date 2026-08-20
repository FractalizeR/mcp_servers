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
  FilteredEntitySchema,
  PaginationMetaSchema,
  buildOutputSchema,
  BatchErrorValueSchema,
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
    issueIds: IssueKeysSchema.describe('Массив ID или ключей задач'),

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

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const GetIssueLinksOutputDataSchema = z.object({
  total: z.number(),
  successful: z.array(
    z.object({
      issueId: z.string(),
      links: z.array(FilteredEntitySchema),
      count: z.number(),
      pagination: PaginationMetaSchema,
    })
  ),
  failed: z.array(
    z.object({
      issueId: z.string(),
      error: BatchErrorValueSchema,
    })
  ),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const GetIssueLinksOutputSchema = buildOutputSchema(GetIssueLinksOutputDataSchema);
