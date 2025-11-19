/**
 * Zod схема для валидации параметров BulkMoveIssuesTool
 */

import { z } from 'zod';

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
