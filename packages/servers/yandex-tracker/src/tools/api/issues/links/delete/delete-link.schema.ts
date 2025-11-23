/**
 * Zod схема для валидации параметров DeleteLinkTool
 */

import { z } from 'zod';
import { IssueKeySchema } from '#common/schemas/index.js';

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
        issueId: IssueKeySchema.describe('Issue ID or key (e.g., TEST-123)'),

        /**
         * ID связи для удаления (обязательно)
         */
        linkId: z.string().min(1, 'linkId не может быть пустым'),
      })
    )
    .min(1, 'Массив links должен содержать минимум 1 элемент')
    .describe('Array of links to delete'),
});

/**
 * Вывод типа из схемы
 */
export type DeleteLinkParams = z.infer<typeof DeleteLinkParamsSchema>;
