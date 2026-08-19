/**
 * Zod схема для валидации параметров GetIssuesTool
 */

import { z } from 'zod';
import {
  IssueKeysSchema,
  FieldsSchema,
  FilteredEntitySchema,
  FieldsReturnedSchema,
  buildOutputSchema,
  BatchErrorValueSchema,
} from '#common/schemas/index.js';

/**
 * Схема параметров для получения задач
 */
export const GetIssuesParamsSchema = z.object({
  /**
   * Массив ключей задач для получения
   */
  issueKeys: IssueKeysSchema,

  /**
   * Опциональный массив полей для фильтрации ответа
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type GetIssuesParams = z.infer<typeof GetIssuesParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const GetIssuesOutputDataSchema = z.object({
  total: z.number(),
  successful: z.number(),
  failed: z.number(),
  issues: z.array(
    z.object({
      issueKey: z.string(),
      issue: FilteredEntitySchema,
    })
  ),
  errors: z.array(
    z.object({
      key: z.string(),
      error: BatchErrorValueSchema,
    })
  ),
  fieldsReturned: FieldsReturnedSchema,
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const GetIssuesOutputSchema = buildOutputSchema(GetIssuesOutputDataSchema);
