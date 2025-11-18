/**
 * Zod схема для валидации параметров AddChecklistItemTool
 */

import { z } from 'zod';
import { IssueKeySchema } from '../../../../common/schemas/index.js';

/**
 * Схема параметров для добавления элемента в чеклист
 */
export const AddChecklistItemParamsSchema = z.object({
  /**
   * Идентификатор или ключ задачи (обязательно)
   */
  issueId: IssueKeySchema.describe('Issue ID or key (e.g., TEST-123)'),

  /**
   * Текст элемента чеклиста (обязательно)
   */
  text: z.string().min(1, 'Текст элемента не может быть пустым'),

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
export type AddChecklistItemParams = z.infer<typeof AddChecklistItemParamsSchema>;
