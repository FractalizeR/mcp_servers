/**
 * Zod схема для валидации параметров GetIssueChangelogTool
 */

import { z } from 'zod';
import { IssueKeySchema, FieldsSchema } from '../../../../common/schemas/index.js';

/**
 * Схема параметров для получения истории изменений задачи
 */
export const GetIssueChangelogParamsSchema = z.object({
  /**
   * Ключ задачи для получения истории
   */
  issueKey: IssueKeySchema,

  /**
   * Опциональный массив полей для фильтрации ответа
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type GetIssueChangelogParams = z.infer<typeof GetIssueChangelogParamsSchema>;
