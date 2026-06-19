/**
 * Zod схема для валидации параметров GetAttachmentsTool (batch-режим)
 */

import { z } from 'zod';
import { IssueKeySchema, FieldsSchema } from '#common/schemas/index.js';
import {
  FetchAllSchema,
  MaxItemsSchema,
  MaxTotalItemsSchema,
  PageSchema,
  PerPageSchema,
  noPageFetchAllConflict,
  PAGINATION_CONFLICT_MESSAGE,
} from '#common/schemas/index.js';

/**
 * Схема параметров для получения списка файлов задач (batch-режим)
 *
 * Паттерн: GET операции с массивом идентификаторов
 * - Массив issueIds для получения файлов нескольких задач
 * - Общие параметры (fields, пагинация) применяются ко всем результатам
 */
export const GetAttachmentsParamsSchema = z
  .object({
    /**
     * Массив ключей или ID задач для получения списка файлов
     */
    issueIds: z
      .array(IssueKeySchema)
      .min(1, 'Массив issueIds должен содержать минимум 1 элемент')
      .describe('Array of issue IDs or keys (e.g., ["TEST-123", "TEST-456"])'),

    /**
     * Массив полей для возврата в результате (обязательный)
     * Примеры: ['id', 'name', 'size'], ['id', 'name', 'createdBy.display']
     */
    fields: FieldsSchema,

    /** Номер страницы (с 1). Игнорируется при fetchAll=true. */
    page: PageSchema,

    /** Количество записей на странице. */
    perPage: PerPageSchema,

    /** Полный обход всех страниц по Link rel="next". */
    fetchAll: FetchAllSchema,

    /** Максимум записей на одну задачу при fetchAll=true. */
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
export type GetAttachmentsParams = z.infer<typeof GetAttachmentsParamsSchema>;
