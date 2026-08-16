/**
 * Zod схема для валидации параметров DeleteLinkTool
 */

import { z } from 'zod';
import { IssueKeySchema, buildOutputSchema } from '#common/schemas/index.js';

/**
 * Схема параметров для удаления связи (batch-режим)
 *
 * Паттерн POST/DELETE операций: Input Pattern - индивидуальные параметры
 * Каждая задача имеет свои параметры (issueId, linkId)
 */
export const DeleteLinkParamsSchema = z.object({
  /**
   * Массив связей для удаления с индивидуальными параметрами
   */
  links: z
    .array(
      z.object({
        /**
         * Идентификатор или ключ задачи (обязательно)
         */
        issueId: IssueKeySchema.describe('ID или ключ задачи (например, TEST-123)'),

        /**
         * ID связи для удаления (обязательно)
         */
        linkId: z.string().min(1, 'linkId не может быть пустым'),
      })
    )
    .min(1, 'Массив links должен содержать минимум 1 элемент')
    .describe('Массив связей для удаления'),
});

/**
 * Вывод типа из схемы
 */
export type DeleteLinkParams = z.infer<typeof DeleteLinkParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const DeleteLinkOutputDataSchema = z.object({
  total: z.number(),
  successful: z.array(
    z.object({
      issueId: z.string(),
      linkId: z.string(),
      success: z.literal(true),
    })
  ),
  failed: z.array(
    z.object({
      issueId: z.string(),
      linkId: z.string(),
      error: z.string(),
    })
  ),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const DeleteLinkOutputSchema = buildOutputSchema(DeleteLinkOutputDataSchema);
