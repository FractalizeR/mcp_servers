/**
 * Zod схема для валидации параметров EditCommentTool
 */

import { z } from 'zod';
import { IssueKeySchema } from '../../../../common/schemas/index.js';

/**
 * Схема параметров для редактирования комментария
 */
export const EditCommentParamsSchema = z.object({
  /**
   * Идентификатор или ключ задачи (обязательно)
   */
  issueId: IssueKeySchema.describe('Issue ID or key (e.g., TEST-123)'),

  /**
   * Идентификатор комментария (обязательно)
   */
  commentId: z.string().min(1, 'Comment ID не может быть пустым'),

  /**
   * Новый текст комментария (обязательно)
   */
  text: z.string().min(1, 'Comment text не может быть пустым'),
});

/**
 * Вывод типа из схемы
 */
export type EditCommentParams = z.infer<typeof EditCommentParamsSchema>;
