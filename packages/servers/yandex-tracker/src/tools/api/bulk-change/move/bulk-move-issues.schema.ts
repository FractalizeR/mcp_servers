/**
 * Zod схема для валидации параметров BulkMoveIssuesTool
 */

import { z } from 'zod';
import { buildOutputSchema, IssueKeysSchema } from '#common/schemas/index.js';

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
   * Массив идентификаторов задач для перемещения (ключ или внутренний id)
   */
  issueIds: IssueKeysSchema,

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
   * Сбросить статус задачи при перемещении в очередь с другим workflow
   */
  initialStatus: z
    .boolean()
    .optional()
    .describe(
      'Сбросить статус на начальный статус workflow целевой очереди (true) или сохранить ' +
        'текущий статус как есть (false, по умолчанию). Важно указать true при перемещении в ' +
        'очередь с другим workflow — иначе задача может остаться в статусе, которого в новом ' +
        'workflow не существует.'
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
  initialStatus: z.boolean(),
  additionalFields: z.array(z.string()),
  note: z.string(),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const BulkMoveIssuesOutputSchema = buildOutputSchema(BulkMoveIssuesOutputDataSchema);
