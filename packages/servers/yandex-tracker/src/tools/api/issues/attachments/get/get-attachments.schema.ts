/**
 * Zod схема для валидации параметров GetAttachmentsTool (batch-режим)
 */

import { z } from 'zod';
import {
  IssueKeySchema,
  FieldsSchema,
  FilteredEntitySchema,
  buildOutputSchema,
  BatchErrorValueSchema,
} from '#common/schemas/index.js';

/**
 * Схема параметров для получения списка файлов задач (batch-режим)
 *
 * Паттерн: GET операции с массивом идентификаторов
 * - Массив issueIds для получения файлов нескольких задач
 * - Общие параметры (fields) применяются ко всем результатам
 *
 * ВАЖНО: эндпоинт `/v3/issues/{id}/attachments` НЕ пагинируется (API отдаёт
 * все вложения за один ответ, без `Link rel="next"`). Поэтому параметры
 * пагинации (page/perPage/fetchAll/maxItems/maxTotalItems) и cursor отсутствуют.
 */
export const GetAttachmentsParamsSchema = z.object({
  /**
   * Массив ключей или ID задач для получения списка файлов
   */
  issueIds: z
    .array(IssueKeySchema)
    .min(1, 'Массив issueIds должен содержать минимум 1 элемент')
    .describe('Массив ID или ключей задач (например, ["TEST-123", "TEST-456"])'),

  /**
   * Массив полей для возврата в результате (обязательный)
   * Примеры: ['id', 'name', 'size'], ['id', 'name', 'createdBy.display']
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type GetAttachmentsParams = z.infer<typeof GetAttachmentsParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const GetAttachmentsOutputDataSchema = z.object({
  total: z.number(),
  successful: z.array(
    z.object({
      issueId: z.string(),
      attachmentsCount: z.number(),
      attachments: z.array(FilteredEntitySchema),
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
export const GetAttachmentsOutputSchema = buildOutputSchema(GetAttachmentsOutputDataSchema);
