/**
 * Zod схема для валидации параметров GetIssuesTool
 */

import { z } from 'zod';
import { IssueKeysSchema, FieldsSchema } from '@mcp-framework/core';

/**
 * Схема параметров для получения задач
 */
export const GetIssuesParamsSchema = z.object({
  /**
   * Массив ключей задач для получения
   */
  issueKeys: IssueKeysSchema,

  /**
   * Опциональный массив полей для фильтрации ответа
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type GetIssuesParams = z.infer<typeof GetIssuesParamsSchema>;
