/**
 * Zod схема для валидации параметров GetChecklistTool (batch-режим)
 */

import { z } from 'zod';
import {
  IssueKeySchema,
  FieldsSchema,
  PageSchema,
  PerPageSchema,
  FetchAllSchema,
  MaxItemsSchema,
  MaxTotalItemsSchema,
  noPageFetchAllConflict,
  PAGINATION_CONFLICT_MESSAGE,
} from '#common/schemas/index.js';

/**
 * Схема параметров для получения чеклистов задач (batch-режим)
 *
 * Паттерн: GET операции с массивом идентификаторов
 * - Массив issueIds для получения чеклистов нескольких задач
 * - Общие параметры (fields, пагинация) применяются ко всем результатам
 */
export const GetChecklistParamsSchema = z
  .object({
    /**
     * Массив ключей или ID задач для получения чеклистов
     */
    issueIds: z
      .array(IssueKeySchema)
      .min(1, 'Массив issueIds должен содержать минимум 1 элемент')
      .describe('Array of issue IDs or keys (e.g., ["TEST-123", "TEST-456"])'),

    /**
     * Массив полей для возврата (обязательный)
     * Примеры: ['id', 'text'], ['id', 'text', 'checked', 'assignee.login']
     */
    fields: FieldsSchema,

    /** Номер страницы (с 1). Игнорируется при fetchAll=true. */
    page: PageSchema,

    /** Количество записей на странице (1..100). */
    perPage: PerPageSchema,

    /** Если true — обойти все страницы по Link rel="next". */
    fetchAll: FetchAllSchema,

    /** Максимум записей на задачу при fetchAll=true (по умолчанию 500). */
    maxItems: MaxItemsSchema,

    /** Общий потолок записей на весь batch-ответ при fetchAll=true (опционально) */
    maxTotalItems: MaxTotalItemsSchema,
  })
  .refine(noPageFetchAllConflict, {
    message: PAGINATION_CONFLICT_MESSAGE,
    path: ['page'],
  });

/**
 * Вывод типа из схемы
 */
export type GetChecklistParams = z.infer<typeof GetChecklistParamsSchema>;
