/**
 * Zod схема для валидации параметров DeleteChecklistItemTool (batch-режим)
 */

import { z } from 'zod';
import { IssueKeySchema } from '#common/schemas/index.js';

/**
 * Схема элемента чеклиста для удаления
 */
const DeleteChecklistItemSchema = z.object({
  /**
   * Идентификатор или ключ задачи (обязательно)
   */
  issueId: IssueKeySchema.describe('Issue ID or key (e.g., TEST-123)'),

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
    .describe('Array of checklist items to delete'),
});

/**
 * Вывод типа из схемы
 */
export type DeleteChecklistItemParams = z.infer<typeof DeleteChecklistItemParamsSchema>;
