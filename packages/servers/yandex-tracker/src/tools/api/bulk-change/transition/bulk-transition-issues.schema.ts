/**
 * Zod схема для валидации параметров BulkTransitionIssuesTool
 */

import { z } from 'zod';

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
   * Массив ключей задач для перевода
   */
  issues: z
    .array(z.string().regex(/^[A-Z][A-Z0-9]+-\d+$/, 'Неверный формат ключа задачи'))
    .min(1, 'Должна быть указана хотя бы одна задача')
    .describe('Массив ключей задач (например, ["PROJ-123", "PROJ-456"])'),

  /**
   * ID или ключ перехода
   */
  transition: z
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
