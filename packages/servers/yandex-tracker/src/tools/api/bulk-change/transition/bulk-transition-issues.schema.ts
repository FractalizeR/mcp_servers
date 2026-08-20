/**
 * Zod схема для валидации параметров BulkTransitionIssuesTool
 */

import { z } from 'zod';
import { buildOutputSchema, IssueKeysSchema } from '#common/schemas/index.js';

/**
 * Схема для опциональных полей при переходе
 */
const BulkTransitionValuesSchema = z
  .object({
    resolution: z.string().min(1).optional().describe('Резолюция (для закрытия задачи)'),
    comment: z.string().optional().describe('Комментарий к переходу'),
    assignee: z.string().optional().describe('Исполнитель'),
    priority: z.string().min(1).optional().describe('Приоритет'),
  })
  .passthrough() // Разрешаем дополнительные поля
  .optional();

/**
 * Схема параметров для массовой смены статусов
 */
export const BulkTransitionIssuesParamsSchema = z.object({
  /**
   * Массив идентификаторов задач для перевода (ключ или внутренний id)
   */
  issueIds: IssueKeysSchema,

  /**
   * ID или ключ перехода
   */
  transitionId: z
    .string()
    .min(1)
    .describe('ID или ключ перехода (например, "start_progress", "close")'),

  /**
   * Опциональные поля для обновления при переходе
   */
  values: BulkTransitionValuesSchema,
});

/**
 * Вывод типа из схемы
 */
export type BulkTransitionIssuesParams = z.infer<typeof BulkTransitionIssuesParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const BulkTransitionIssuesOutputDataSchema = z.object({
  message: z.string(),
  operationId: z.string(),
  status: z.string(),
  totalIssues: z.number(),
  transitionId: z.string(),
  additionalFields: z.array(z.string()),
  note: z.string(),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const BulkTransitionIssuesOutputSchema = buildOutputSchema(
  BulkTransitionIssuesOutputDataSchema
);
