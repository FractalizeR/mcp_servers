/**
 * Zod схема для валидации параметров AddChecklistItemTool (batch-режим)
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
 * Схема элемента чеклиста с индивидуальными параметрами
 *
 * Использует базовую схему с:
 * - issueId, text: обязательно
 * - checked, assignee, deadline: опционально (через .partial())
 */
const ChecklistItemSchema = z
  .object({
    /**
     * Идентификатор или ключ задачи (обязательно)
     */
    issueId: IssueKeySchema.describe('ID или ключ задачи (например, TEST-123)'),
  })
  .merge(BaseChecklistItemFieldsSchema.pick({ text: true }))
  .merge(
    BaseChecklistItemFieldsSchema.pick({ checked: true, assignee: true, deadline: true }).partial()
  );

/**
 * Схема параметров для добавления элементов в чеклисты (batch-режим)
 *
 * Паттерн POST операций: Input Pattern - индивидуальные параметры
 * Каждая задача имеет свои параметры (text, checked, assignee, deadline)
 */
export const AddChecklistItemParamsSchema = z.object({
  /**
   * Массив элементов чеклиста с индивидуальными параметрами для каждой задачи
   */
  items: z
    .array(ChecklistItemSchema)
    .min(1, 'Массив items должен содержать минимум 1 элемент')
    .describe('Массив элементов чеклиста для добавления к задачам'),

  /**
   * Массив полей для возврата в результате (обязательный)
   * Примеры: ['id', 'text', 'checked'], ['id', 'text', 'assignee.display']
   * Применяется ко всем созданным элементам
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type AddChecklistItemParams = z.infer<typeof AddChecklistItemParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const AddChecklistItemOutputDataSchema = z.object({
  total: z.number(),
  successful: z.number(),
  failed: z.number(),
  items: z.array(
    z.object({
      issueId: z.string(),
      itemId: z.string(),
      item: FilteredEntitySchema,
    })
  ),
  errors: z.array(
    z.object({
      issueId: z.string(),
      error: BatchErrorValueSchema,
    })
  ),
  fieldsReturned: FieldsReturnedSchema,
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const AddChecklistItemOutputSchema = buildOutputSchema(AddChecklistItemOutputDataSchema);
