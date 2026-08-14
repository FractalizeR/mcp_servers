/**
 * Zod схема для валидации параметров IssueUrlTool
 */

import { z } from 'zod';
import { IssueKeysSchema, buildOutputSchema } from '#common/schemas/index.js';

/**
 * Схема параметров для получения URL задач
 */
export const IssueUrlParamsSchema = z.object({
  /**
   * Массив ключей задач в формате QUEUE-123
   */
  issueKeys: IssueKeysSchema,
});

/**
 * Вывод типа из схемы
 */
export type IssueUrlParams = z.infer<typeof IssueUrlParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const IssueUrlOutputDataSchema = z.object({
  count: z.number(),
  urls: z.array(
    z.object({
      issueKey: z.string(),
      url: z.string(),
      description: z.string(),
    })
  ),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const IssueUrlOutputSchema = buildOutputSchema(IssueUrlOutputDataSchema);
