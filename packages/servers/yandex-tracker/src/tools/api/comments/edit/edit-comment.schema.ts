/**
 * Zod схема для валидации параметров EditCommentTool (batch-режим)
 */

import { z } from 'zod';
import { IssueKeySchema, FieldsSchema } from '#common/schemas/index.js';

/**
 * Схема параметров для редактирования комментариев (batch-режим)
 *
 * Паттерн: POST/PATCH операции с индивидуальными параметрами
 * - Массив объектов с индивидуальными параметрами для каждого комментария
 * - Общие параметры (fields) применяются ко всем результатам
 */
export const EditCommentParamsSchema = z.object({
  /**
   * Массив комментариев для редактирования
   */
  comments: z
    .array(
      z.object({
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
      })
    )
    .min(1, 'Массив comments должен содержать минимум 1 элемент')
    .describe('Array of comments to edit'),

  /**
   * Массив полей для возврата в результате (обязательный)
   * Применяется ко всем комментариям
   * Примеры: ['id', 'text', 'updatedAt'], ['id', 'text', 'updatedBy.login']
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type EditCommentParams = z.infer<typeof EditCommentParamsSchema>;
