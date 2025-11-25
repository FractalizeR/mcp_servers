/**
 * Zod схема для валидации параметров AddChecklistItemTool (batch-режим)
 */

import { z } from 'zod';
import { IssueKeySchema, FieldsSchema } from '#common/schemas/index.js';
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
    issueId: IssueKeySchema.describe('Issue ID or key (e.g., TEST-123)'),
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
    .describe('Array of checklist items to add to issues'),

  /**
   * Массив полей для возврата в результате (обязательный)
   * Примеры: ['id', 'text', 'checked'], ['id', 'text', 'assignee.login']
   * Применяется ко всем созданным элементам
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type AddChecklistItemParams = z.infer<typeof AddChecklistItemParamsSchema>;
