/**
 * Zod схема для валидации параметров TransitionIssueTool
 */

import { z } from 'zod';
import {
  IssueKeySchema,
  FieldsSchema,
  FilteredEntitySchema,
  buildOutputSchema,
} from '#common/schemas/index.js';

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
  fields: FieldsSchema.optional(),
});

/**
 * Вывод типа из схемы
 */
export type TransitionIssueParams = z.infer<typeof TransitionIssueParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 *
 * `fieldsReturned` — либо эхо параметра `fields`, либо литерал `'all'`, когда
 * `fields` не передан (см. tool.ts: `fields ?? 'all'`).
 */
export const TransitionIssueOutputDataSchema = z.object({
  issueKey: z.string(),
  transitionId: z.string(),
  issue: FilteredEntitySchema,
  fieldsReturned: z.union([z.array(z.string()), z.literal('all')]),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const TransitionIssueOutputSchema = buildOutputSchema(TransitionIssueOutputDataSchema);
