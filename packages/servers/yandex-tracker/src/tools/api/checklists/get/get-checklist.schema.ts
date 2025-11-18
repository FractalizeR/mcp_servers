/**
 * Zod схема для валидации параметров GetChecklistTool
 */

import { z } from 'zod';
import { IssueKeySchema } from '../../../../common/schemas/index.js';

/**
 * Схема параметров для получения чеклиста
 */
export const GetChecklistParamsSchema = z.object({
  /**
   * Идентификатор или ключ задачи (обязательно)
   */
  issueId: IssueKeySchema.describe('Issue ID or key (e.g., TEST-123)'),
});

/**
 * Вывод типа из схемы
 */
export type GetChecklistParams = z.infer<typeof GetChecklistParamsSchema>;
