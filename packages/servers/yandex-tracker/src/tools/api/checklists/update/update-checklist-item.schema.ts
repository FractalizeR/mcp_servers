/**
 * Zod схема для валидации параметров UpdateChecklistItemTool (batch-режим)
 */

import { z } from 'zod';
import {
  IssueKeySchema,
  FieldsSchema,
  FilteredEntitySchema,
  FieldsReturnedSchema,
  BatchErrorValueSchema,
  buildOutputSchema,
} from '#common/schemas/index.js';
import { BaseChecklistItemFieldsSchema } from '../base-checklist-item.schema.js';

/**
 * Схема элемента для обновления с индивидуальными параметрами
 *
 * Использует базовую схему с:
 * - issueId, checklistItemId: обязательно
 * - text, checked, assignee, deadline: опционально (через .partial())
 */
const UpdateChecklistItemElementSchema = z
  .object({
    /**
     * Идентификатор или ключ задачи (обязательно)
     */
    issueId: IssueKeySchema.describe('ID или ключ задачи (например, TEST-123)'),

    /**
     * Идентификатор элемента чеклиста (обязательно)
     */
    checklistItemId: z.string().min(1, 'ID элемента не может быть пустым'),
  })
  .merge(BaseChecklistItemFieldsSchema.partial());

/**
 * Схема параметров для обновления элементов чеклистов (batch-режим)
 *
 * Паттерн PATCH операций: Input Pattern - индивидуальные параметры
 * Каждый элемент имеет свои параметры (text?, checked?, assignee?, deadline?)
 */
export const UpdateChecklistItemParamsSchema = z.object({
  /**
   * Массив элементов чеклиста с индивидуальными параметрами для обновления
   */
  items: z
    .array(UpdateChecklistItemElementSchema)
    .min(1, 'Массив items должен содержать минимум 1 элемент')
    .describe('Массив элементов чеклиста для обновления'),

  /**
   * Массив полей для возврата в результате (обязательный)
   * Примеры: ['id', 'text', 'checked'], ['id', 'text', 'assignee.display']
   * Применяется ко всем обновлённым элементам
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type UpdateChecklistItemParams = z.infer<typeof UpdateChecklistItemParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const UpdateChecklistItemOutputDataSchema = z.object({
  total: z.number(),
  successful: z.number(),
  failed: z.number(),
  items: z.array(
    z.object({
      issueId: z.string(),
      checklistItemId: z.string(),
      item: FilteredEntitySchema,
    })
  ),
  errors: z.array(
    z.object({
      issueId: z.string(),
      checklistItemId: z.string(),
      error: BatchErrorValueSchema,
    })
  ),
  fieldsReturned: FieldsReturnedSchema,
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const UpdateChecklistItemOutputSchema = buildOutputSchema(
  UpdateChecklistItemOutputDataSchema
);
