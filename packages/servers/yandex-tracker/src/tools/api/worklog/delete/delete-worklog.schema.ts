/**
 * Zod схема для валидации параметров DeleteWorklogTool
 */

import { z } from 'zod';
import { IssueKeySchema } from '../../../../common/schemas/index.js';

/**
 * Схема параметров для удаления записи времени
 */
export const DeleteWorklogParamsSchema = z.object({
  /**
   * Идентификатор или ключ задачи (обязательно)
   */
  issueId: IssueKeySchema.describe('Issue ID or key (e.g., TEST-123)'),

  /**
   * Идентификатор записи времени (обязательно)
   */
  worklogId: z.string().describe('Worklog ID to delete'),
});

/**
 * Вывод типа из схемы
 */
export type DeleteWorklogParams = z.infer<typeof DeleteWorklogParamsSchema>;
