/**
 * Zod схема для валидации параметров GetIssueTransitionsTool
 */

import { z } from 'zod';
import {
  IssueKeySchema,
  FieldsSchema,
  FilteredEntitySchema,
  buildOutputSchema,
} from '#common/schemas/index.js';

/**
 * Схема параметров для получения доступных переходов статусов задачи
 */
export const GetIssueTransitionsParamsSchema = z.object({
  /**
   * Ключ задачи для получения доступных переходов
   */
  issueId: IssueKeySchema,

  /**
   * Опциональный массив полей для фильтрации ответа
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type GetIssueTransitionsParams = z.infer<typeof GetIssueTransitionsParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const GetIssueTransitionsOutputDataSchema = z.object({
  issueId: z.string(),
  transitionsCount: z.number(),
  transitions: z.array(FilteredEntitySchema),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const GetIssueTransitionsOutputSchema = buildOutputSchema(
  GetIssueTransitionsOutputDataSchema
);
