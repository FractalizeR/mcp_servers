/**
 * Zod схема для валидации параметров GetChecklistTool (batch-режим)
 */

import { z } from 'zod';
import { IssueKeySchema, FieldsSchema } from '#common/schemas/index.js';

/**
 * Схема параметров для получения чеклистов задач (batch-режим)
 *
 * Паттерн: GET операции с массивом идентификаторов
 * - Массив issueIds для получения чеклистов нескольких задач
 * - Общие параметры (fields) применяются ко всем результатам
 */
export const GetChecklistParamsSchema = z.object({
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
});

/**
 * Вывод типа из схемы
 */
export type GetChecklistParams = z.infer<typeof GetChecklistParamsSchema>;
