/**
 * Zod схема для валидации параметров GetIssueTransitionsTool
 */

import { z } from 'zod';
import { IssueKeySchema, FieldsSchema } from '../../../../../common/schemas/index.js';

/**
 * Схема параметров для получения доступных переходов статусов задачи
 */
export const GetIssueTransitionsParamsSchema = z.object({
  /**
   * Ключ задачи для получения доступных переходов
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
export type GetIssueTransitionsParams = z.infer<typeof GetIssueTransitionsParamsSchema>;
