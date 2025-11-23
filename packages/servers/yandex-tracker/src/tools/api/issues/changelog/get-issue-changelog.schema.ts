/**
 * Zod схема для валидации параметров GetIssueChangelogTool
 */

import { z } from 'zod';
import { IssueKeysSchema, FieldsSchema } from '#common/schemas/index.js';

/**
 * Схема параметров для получения истории изменений задач (batch-режим)
 */
export const GetIssueChangelogParamsSchema = z.object({
  /**
   * Массив ключей задач для получения истории
   */
  issueKeys: IssueKeysSchema.describe('Массив ключей задач (например, ["QUEUE-1", "QUEUE-2"])'),

  /**
   * Опциональный массив полей для фильтрации ответа
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type GetIssueChangelogParams = z.infer<typeof GetIssueChangelogParamsSchema>;
