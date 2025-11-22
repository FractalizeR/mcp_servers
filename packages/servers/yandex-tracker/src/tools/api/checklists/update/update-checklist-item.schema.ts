/**
 * Zod схема для валидации параметров UpdateChecklistItemTool
 */

import { z } from 'zod';
import { IssueKeySchema, FieldsSchema } from '#common/schemas/index.js';
import { BaseChecklistItemFieldsSchema } from '../base-checklist-item.schema.js';

/**
 * Схема параметров для обновления элемента чеклиста
 *
 * Использует базовую схему с:
 * - checklistItemId: обязательно
 * - все поля базовой схемы: опционально (через .partial())
 */
export const UpdateChecklistItemParamsSchema = z
  .object({
    /**
     * Идентификатор или ключ задачи (обязательно)
     */
    issueId: IssueKeySchema.describe('Issue ID or key (e.g., TEST-123)'),

    /**
     * Идентификатор элемента чеклиста (обязательно)
     */
    checklistItemId: z.string().min(1, 'ID элемента не может быть пустым'),

    /**
     * Массив полей для возврата в результате (обязательный)
     * Примеры: ['id', 'text', 'checked'], ['id', 'text', 'assignee.login']
     */
    fields: FieldsSchema,
  })
  .merge(BaseChecklistItemFieldsSchema.partial());

/**
 * Вывод типа из схемы
 */
export type UpdateChecklistItemParams = z.infer<typeof UpdateChecklistItemParamsSchema>;
