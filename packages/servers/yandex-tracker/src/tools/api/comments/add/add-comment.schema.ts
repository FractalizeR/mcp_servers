/**
 * Zod схема для валидации параметров AddCommentTool
 */

import { z } from 'zod';
import {
  IssueKeySchema,
  FieldsSchema,
  FilteredEntitySchema,
  FieldsReturnedSchema,
  buildOutputSchema,
} from '#common/schemas/index.js';

/**
 * Схема параметров для добавления комментария (batch-режим)
 *
 * Паттерн POST операций: Input Pattern - индивидуальные параметры
 * Каждая задача имеет свои параметры (text, attachmentIds)
 */
export const AddCommentParamsSchema = z.object({
  /**
   * Массив комментариев с индивидуальными параметрами для каждой задачи
   */
  comments: z
    .array(
      z.object({
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

        /**
         * Логины или ID пользователей для упоминания (@) в комментарии — присылает им уведомление
         */
        summonees: z
          .array(z.string().min(1))
          .optional()
          .describe(
            'Логины или ID пользователей для упоминания (@) в комментарии. ' +
              'Упомянутые получают уведомление о комментарии.'
          ),

        /**
         * Email-адреса рассылок для упоминания в комментарии
         */
        maillistSummonees: z
          .array(z.string().min(1))
          .optional()
          .describe('Email-адреса рассылок для упоминания в комментарии'),

        /**
         * Формат разметки текста комментария
         */
        markupType: z
          .string()
          .min(1)
          .optional()
          .describe(
            "Формат разметки текста комментария. Укажи 'md' для Markdown, иначе используется " +
              'формат Трекера по умолчанию.'
          ),

        /**
         * Добавлять ли упомянутых (summonees) в наблюдатели задачи
         */
        isAddToFollowers: z
          .boolean()
          .optional()
          .describe(
            'Добавить упомянутых (summonees) в наблюдатели задачи. По умолчанию на стороне API — true.'
          ),
      })
    )
    .min(1, 'Массив comments должен содержать минимум 1 элемент')
    .describe('Array of comments to add to issues'),

  /**
   * Массив полей для возврата в результате (обязательный)
   * Примеры: ['id', 'text', 'createdAt'], ['id', 'text', 'createdBy.login']
   * Применяется ко всем созданным комментариям
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type AddCommentParams = z.infer<typeof AddCommentParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const AddCommentOutputDataSchema = z.object({
  total: z.number().describe('Всего запрошено комментариев к добавлению'),
  successful: z.number().describe('Количество успешно добавленных комментариев'),
  failed: z.number().describe('Количество комментариев, добавить которые не удалось'),
  comments: z.array(
    z.object({
      issueId: z.string(),
      commentId: z.string(),
      comment: FilteredEntitySchema,
    })
  ),
  errors: z.array(
    z.object({
      issueId: z.string(),
      error: z.string(),
    })
  ),
  fieldsReturned: FieldsReturnedSchema,
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const AddCommentOutputSchema = buildOutputSchema(AddCommentOutputDataSchema);
