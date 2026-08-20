/**
 * Zod схема для валидации параметров EditCommentTool (batch-режим)
 */

import { z } from 'zod';
import {
  IssueKeySchema,
  FieldsSchema,
  FilteredEntitySchema,
  buildOutputSchema,
  makeBatchSuccessItemSchema,
  makeBatchErrorItemSchema,
} from '#common/schemas/index.js';

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
        issueId: IssueKeySchema.describe('ID или ключ задачи (например, TEST-123)'),

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
    .describe('Массив комментариев для редактирования'),

  /**
   * Массив полей для возврата в результате (обязательный)
   * Применяется ко всем комментариям
   * Примеры: ['id', 'text', 'updatedAt'], ['id', 'text', 'updatedBy.display']
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type EditCommentParams = z.infer<typeof EditCommentParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const EditCommentOutputDataSchema = z.object({
  total: z.number().describe('Всего запрошено комментариев к редактированию'),
  successful: z.array(
    makeBatchSuccessItemSchema(
      'issueId',
      z.object({ commentId: z.string(), comment: FilteredEntitySchema })
    )
  ),
  failed: z.array(makeBatchErrorItemSchema('issueId').extend({ commentId: z.string() })),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const EditCommentOutputSchema = buildOutputSchema(EditCommentOutputDataSchema);
