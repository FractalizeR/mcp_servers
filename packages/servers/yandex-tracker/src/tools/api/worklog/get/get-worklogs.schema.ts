/**
 * Zod схема для валидации параметров GetWorklogsTool
 */

import { z } from 'zod';
import { IssueKeySchema, FieldsSchema } from '../../../../common/schemas/index.js';

/**
 * Схема параметров для получения записей времени
 */
export const GetWorklogsParamsSchema = z.object({
  /**
   * Идентификатор или ключ задачи (обязательно)
   */
  issueId: IssueKeySchema.describe('Issue ID or key (e.g., TEST-123)'),

  /**
   * Поля, которые нужно вернуть (обязательно)
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type GetWorklogsParams = z.infer<typeof GetWorklogsParamsSchema>;
