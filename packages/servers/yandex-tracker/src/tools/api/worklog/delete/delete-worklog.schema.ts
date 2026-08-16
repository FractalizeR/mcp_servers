/**
 * Zod схема для валидации параметров DeleteWorklogTool
 */

import { z } from 'zod';
import { IssueKeySchema, buildOutputSchema } from '#common/schemas/index.js';

/**
 * Схема параметров для удаления записи времени
 */
export const DeleteWorklogParamsSchema = z.object({
  /**
   * Идентификатор или ключ задачи (обязательно)
   */
  issueId: IssueKeySchema.describe('ID или ключ задачи (например, TEST-123)'),

  /**
   * Идентификатор записи времени (обязательно)
   */
  worklogId: z.string().describe('ID записи времени для удаления'),
});

/**
 * Вывод типа из схемы
 */
export type DeleteWorklogParams = z.infer<typeof DeleteWorklogParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const DeleteWorklogOutputDataSchema = z.object({
  issueId: z.string(),
  worklogId: z.string(),
  message: z.string(),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const DeleteWorklogOutputSchema = buildOutputSchema(DeleteWorklogOutputDataSchema);
