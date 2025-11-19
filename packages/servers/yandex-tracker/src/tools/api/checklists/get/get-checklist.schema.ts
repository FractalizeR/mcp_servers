/**
 * Zod схема для валидации параметров GetChecklistTool
 */

import { z } from 'zod';
import { IssueKeySchema, FieldsSchema } from '../../../../common/schemas/index.js';

/**
 * Схема параметров для получения чеклиста
 */
export const GetChecklistParamsSchema = z.object({
  /**
   * Идентификатор или ключ задачи (обязательно)
   */
  issueId: IssueKeySchema.describe('Issue ID or key (e.g., TEST-123)'),

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
