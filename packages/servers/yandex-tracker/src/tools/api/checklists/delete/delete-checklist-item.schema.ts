/**
 * Zod схема для валидации параметров DeleteChecklistItemTool (batch-режим)
 */

import { z } from 'zod';
import { IssueKeySchema, buildOutputSchema } from '#common/schemas/index.js';

/**
 * Схема элемента чеклиста для удаления
 */
const DeleteChecklistItemSchema = z.object({
  /**
   * Идентификатор или ключ задачи (обязательно)
   */
  issueId: IssueKeySchema.describe('ID или ключ задачи (например, TEST-123)'),

  /**
   * Идентификатор элемента чеклиста (обязательно)
   */
  itemId: z.string().min(1, 'ID элемента не может быть пустым'),
});

/**
 * Схема параметров для удаления элементов из чеклистов (batch-режим)
 *
 * Паттерн DELETE операций: Input Pattern - индивидуальные параметры
 * Каждый элемент имеет свои параметры (issueId, itemId)
 */
export const DeleteChecklistItemParamsSchema = z.object({
  /**
   * Массив элементов чеклиста для удаления
   */
  items: z
    .array(DeleteChecklistItemSchema)
    .min(1, 'Массив items должен содержать минимум 1 элемент')
    .describe('Массив элементов чеклиста для удаления'),
});

/**
 * Вывод типа из схемы
 */
export type DeleteChecklistItemParams = z.infer<typeof DeleteChecklistItemParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const DeleteChecklistItemOutputDataSchema = z.object({
  total: z.number(),
  successful: z.number(),
  failed: z.number(),
  items: z.array(
    z.object({
      issueId: z.string(),
      itemId: z.string(),
      success: z.literal(true),
    })
  ),
  errors: z.array(
    z.object({
      issueId: z.string(),
      itemId: z.string(),
      error: z.string(),
    })
  ),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const DeleteChecklistItemOutputSchema = buildOutputSchema(
  DeleteChecklistItemOutputDataSchema
);
