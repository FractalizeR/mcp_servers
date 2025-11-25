/**
 * Zod схема для валидации параметров GetAttachmentsTool (batch-режим)
 */

import { z } from 'zod';
import { IssueKeySchema, FieldsSchema } from '#common/schemas/index.js';

/**
 * Схема параметров для получения списка файлов задач (batch-режим)
 *
 * Паттерн: GET операции с массивом идентификаторов
 * - Массив issueIds для получения файлов нескольких задач
 * - Общие параметры (fields) применяются ко всем результатам
 */
export const GetAttachmentsParamsSchema = z.object({
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
});

/**
 * Вывод типа из схемы
 */
export type GetAttachmentsParams = z.infer<typeof GetAttachmentsParamsSchema>;
