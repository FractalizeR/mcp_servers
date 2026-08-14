/**
 * Zod схема для валидации параметров DeleteCommentTool
 *
 * Паттерн DELETE операций: Input Pattern - индивидуальные параметры
 * Каждая задача имеет свои параметры (issueId, commentId)
 */

import { z } from 'zod';
import { IssueKeySchema, buildOutputSchema } from '#common/schemas/index.js';

/**
 * Схема параметров для удаления комментариев (batch-режим)
 */
export const DeleteCommentParamsSchema = z.object({
  /**
   * Массив комментариев для удаления с индивидуальными параметрами
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
      })
    )
    .min(1, 'Массив comments должен содержать минимум 1 элемент')
    .describe('Array of comments to delete'),
});

/**
 * Вывод типа из схемы
 */
export type DeleteCommentParams = z.infer<typeof DeleteCommentParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const DeleteCommentOutputDataSchema = z.object({
  total: z.number().describe('Всего запрошено комментариев к удалению'),
  successful: z.array(
    z.object({
      issueId: z.string(),
      commentId: z.string(),
      success: z.literal(true),
    })
  ),
  failed: z.array(
    z.object({
      issueId: z.string(),
      commentId: z.string(),
      error: z.string(),
    })
  ),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const DeleteCommentOutputSchema = buildOutputSchema(DeleteCommentOutputDataSchema);
