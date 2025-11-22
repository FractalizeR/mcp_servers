/**
 * Zod схема для валидации параметров AddChecklistItemTool
 */

import { z } from 'zod';
import { IssueKeySchema, FieldsSchema } from '#common/schemas/index.js';
import { BaseChecklistItemFieldsSchema } from '../base-checklist-item.schema.js';

/**
 * Схема параметров для добавления элемента в чеклист
 *
 * Использует базовую схему с:
 * - text: обязательно (из базовой схемы)
 * - checked, assignee, deadline: опционально (через .partial())
 */
export const AddChecklistItemParamsSchema = z
  .object({
    /**
     * Идентификатор или ключ задачи (обязательно)
     */
    issueId: IssueKeySchema.describe('Issue ID or key (e.g., TEST-123)'),
  })
  .merge(BaseChecklistItemFieldsSchema.pick({ text: true }))
  .merge(
    BaseChecklistItemFieldsSchema.pick({ checked: true, assignee: true, deadline: true }).partial()
  )
  .merge(
    z.object({
      /**
       * Массив полей для возврата в результате (обязательный)
       * Примеры: ['id', 'text', 'checked'], ['id', 'text', 'assignee.login']
       */
      fields: FieldsSchema,
    })
  );

/**
 * Вывод типа из схемы
 */
export type AddChecklistItemParams = z.infer<typeof AddChecklistItemParamsSchema>;
