/**
 * Zod схема для валидации параметров BulkMoveIssuesTool
 */

import { z } from 'zod';
import { buildOutputSchema } from '#common/schemas/index.js';

/**
 * Схема для опциональных полей при перемещении
 */
const BulkMoveValuesSchema = z
  .object({
    assignee: z.string().optional().describe('Исполнитель в новой очереди'),
    priority: z.string().min(1).optional().describe('Приоритет в новой очереди'),
    type: z.string().min(1).optional().describe('Тип задачи в новой очереди'),
  })
  .passthrough() // Разрешаем дополнительные поля
  .optional();

/**
 * Схема параметров для массового перемещения задач
 */
export const BulkMoveIssuesParamsSchema = z.object({
  /**
   * Массив ключей задач для перемещения
   */
  issues: z
    .array(z.string().regex(/^[A-Z][A-Z0-9]+-\d+$/, 'Неверный формат ключа задачи'))
    .min(1, 'Должна быть указана хотя бы одна задача')
    .describe('Массив ключей задач (например, ["PROJ-123", "PROJ-456"])'),

  /**
   * Ключ целевой очереди
   */
  queue: z
    .string()
    .regex(/^[A-Z][A-Z0-9]+$/, 'Неверный формат ключа очереди')
    .describe('Ключ целевой очереди (например, "SUPPORT", "DEVELOPMENT")'),

  /**
   * Переместить все поля включая кастомные
   */
  moveAllFields: z
    .boolean()
    .optional()
    .describe(
      'Переместить все поля включая кастомные (true) или только стандартные (false, по умолчанию)'
    ),

  /**
   * Опциональные поля для обновления при перемещении
   */
  values: BulkMoveValuesSchema,
});

/**
 * Вывод типа из схемы
 */
export type BulkMoveIssuesParams = z.infer<typeof BulkMoveIssuesParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 *
 * Операция асинхронная — сразу возвращается только `operationId` для опроса
 * через `get_bulk_change_status`, а не финальный результат перемещения.
 */
export const BulkMoveIssuesOutputDataSchema = z.object({
  message: z.string(),
  operationId: z.string(),
  status: z.string(),
  totalIssues: z.number(),
  targetQueue: z.string(),
  moveAllFields: z.boolean(),
  additionalFields: z.array(z.string()),
  note: z.string(),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const BulkMoveIssuesOutputSchema = buildOutputSchema(BulkMoveIssuesOutputDataSchema);
