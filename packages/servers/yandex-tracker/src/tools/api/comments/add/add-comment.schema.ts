/**
 * Zod схема для валидации параметров AddCommentTool
 */

import { z } from 'zod';
import { IssueKeySchema } from '../../../../common/schemas/index.js';

/**
 * Схема параметров для добавления комментария
 */
export const AddCommentParamsSchema = z.object({
  /**
   * Идентификатор или ключ задачи (обязательно)
   */
  issueId: IssueKeySchema.describe('Issue ID or key (e.g., TEST-123)'),

  /**
   * Текст комментария (обязательно)
   */
  text: z.string().min(1, 'Comment text не может быть пустым'),

  /**
   * Идентификаторы вложений (опционально)
   */
  attachmentIds: z.array(z.string()).optional(),
});

/**
 * Вывод типа из схемы
 */
export type AddCommentParams = z.infer<typeof AddCommentParamsSchema>;
