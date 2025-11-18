/**
 * Zod схема для валидации параметров UpdateChecklistItemTool
 */

import { z } from 'zod';
import { IssueKeySchema } from '../../../../common/schemas/index.js';

/**
 * Схема параметров для обновления элемента чеклиста
 */
export const UpdateChecklistItemParamsSchema = z.object({
  /**
   * Идентификатор или ключ задачи (обязательно)
   */
  issueId: IssueKeySchema.describe('Issue ID or key (e.g., TEST-123)'),

  /**
   * Идентификатор элемента чеклиста (обязательно)
   */
  checklistItemId: z.string().min(1, 'ID элемента не может быть пустым'),

  /**
   * Текст элемента чеклиста (опционально)
   */
  text: z.string().min(1).optional(),

  /**
   * Статус выполнения (опционально)
   */
  checked: z.boolean().optional(),

  /**
   * ID назначенного лица (опционально)
   */
  assignee: z.string().optional(),

  /**
   * Дедлайн в формате ISO 8601 (опционально)
   */
  deadline: z.string().optional(),
});

/**
 * Вывод типа из схемы
 */
export type UpdateChecklistItemParams = z.infer<typeof UpdateChecklistItemParamsSchema>;
