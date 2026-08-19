/**
 * Zod схема для валидации параметров GetChecklistTool (batch-режим)
 */

import { z } from 'zod';
import {
  IssueKeySchema,
  FieldsSchema,
  PerPageSchema,
  FetchAllSchema,
  MaxItemsSchema,
  MaxTotalItemsSchema,
  CursorSchema,
  noCursorWithBulkParams,
  PAGINATION_CURSOR_CONFLICT_MESSAGE,
  cursorRequiresSingleIssue,
  PAGINATION_CURSOR_BATCH_MESSAGE,
  FilteredEntitySchema,
  FieldsReturnedSchema,
  PaginationMetaSchema,
  BatchErrorValueSchema,
  buildOutputSchema,
} from '#common/schemas/index.js';

/**
 * Схема параметров для получения чеклистов задач (batch-режим)
 *
 * Паттерн: GET операции с массивом идентификаторов
 * - Массив issueIds для получения чеклистов нескольких задач
 * - Общие параметры (fields, пагинация) применяются ко всем результатам
 *
 * Пагинация: непрозрачный `cursor` (из `pagination.nextCursor`) либо первая
 * страница + `fetchAll`. Курсор несовместим с bulk-параметрами и допустим
 * только при одном issueId.
 */
export const GetChecklistParamsSchema = z
  .object({
    /**
     * Массив ключей или ID задач для получения чеклистов
     */
    issueIds: z
      .array(IssueKeySchema)
      .min(1, 'Массив issueIds должен содержать минимум 1 элемент')
      .describe('Массив ID или ключей задач (например, ["TEST-123", "TEST-456"])'),

    /**
     * Массив полей для возврата (обязательный)
     * Примеры: ['id', 'text'], ['id', 'text', 'checked', 'assignee.display']
     */
    fields: FieldsSchema,

    /** Непрозрачный курсор следующей страницы из pagination.nextCursor. */
    cursor: CursorSchema,

    /** Количество записей на странице (1..100). */
    perPage: PerPageSchema,

    /** Если true — обойти все страницы по Link rel="next". */
    fetchAll: FetchAllSchema,

    /** Максимум записей на задачу при fetchAll=true (по умолчанию 500). */
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
export type GetChecklistParams = z.infer<typeof GetChecklistParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const GetChecklistOutputDataSchema = z.object({
  total: z.number(),
  successful: z.array(
    z.object({
      issueId: z.string(),
      itemsCount: z.number(),
      checklist: z.array(FilteredEntitySchema),
      pagination: PaginationMetaSchema,
    })
  ),
  failed: z.array(
    z.object({
      issueId: z.string(),
      error: BatchErrorValueSchema,
    })
  ),
  fieldsReturned: FieldsReturnedSchema,
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const GetChecklistOutputSchema = buildOutputSchema(GetChecklistOutputDataSchema);
