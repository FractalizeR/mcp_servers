/**
 * Zod схема для валидации параметров TransitionIssueTool
 */

import { z } from 'zod';
import { IssueKeySchema, FieldsSchema } from '../../../../../common/schemas/index.js';

/**
 * Схема параметров для выполнения перехода задачи
 */
export const TransitionIssueParamsSchema = z.object({
  /**
   * Ключ задачи для перехода
   */
  issueKey: IssueKeySchema,

  /**
   * Идентификатор перехода (получается из GetIssueTransitionsTool)
   */
  transitionId: z.string().min(1, 'Идентификатор перехода не может быть пустым'),

  /**
   * Комментарий при переходе (опционально)
   */
  comment: z.string().optional(),

  /**
   * Дополнительные поля для заполнения при переходе (опционально)
   * Например: { "resolution": "fixed", "customField": "value" }
   */
  customFields: z.record(z.string(), z.unknown()).optional(),

  /**
   * Опциональный массив полей для фильтрации ответа
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type TransitionIssueParams = z.infer<typeof TransitionIssueParamsSchema>;
