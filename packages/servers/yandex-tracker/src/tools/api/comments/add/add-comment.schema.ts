/**
 * Zod схема для валидации параметров AddCommentTool
 */

import { z } from 'zod';
import {
  IssueKeySchema,
  FieldsSchema,
  FilteredEntitySchema,
  buildOutputSchema,
  makeBatchResultSchema,
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
        issueId: IssueKeySchema.describe('ID или ключ задачи (например, TEST-123)'),

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
    .describe('Массив комментариев для добавления к задачам'),

  /**
   * Массив полей для возврата в результате (обязательный)
   * Примеры: ['id', 'text', 'createdAt'], ['id', 'text', 'createdBy.display']
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
export const AddCommentOutputDataSchema = makeBatchResultSchema(
  'issueId',
  z.object({
    commentId: z.string(),
    comment: FilteredEntitySchema,
  })
);

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const AddCommentOutputSchema = buildOutputSchema(AddCommentOutputDataSchema);
