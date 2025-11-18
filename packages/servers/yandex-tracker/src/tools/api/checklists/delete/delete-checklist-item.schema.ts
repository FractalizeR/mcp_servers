/**
 * Zod схема для валидации параметров DeleteChecklistItemTool
 */

import { z } from 'zod';
import { IssueKeySchema } from '../../../../common/schemas/index.js';

/**
 * Схема параметров для удаления элемента чеклиста
 */
export const DeleteChecklistItemParamsSchema = z.object({
  /**
   * Идентификатор или ключ задачи (обязательно)
   */
  issueId: IssueKeySchema.describe('Issue ID or key (e.g., TEST-123)'),

  /**
   * Идентификатор элемента чеклиста (обязательно)
   */
  checklistItemId: z.string().min(1, 'ID элемента не может быть пустым'),
});

/**
 * Вывод типа из схемы
 */
export type DeleteChecklistItemParams = z.infer<typeof DeleteChecklistItemParamsSchema>;
