/**
 * Zod схемы для валидации ключей задач Яндекс.Трекера
 */

import { z } from 'zod';

/**
 * Валидация ключа задачи Яндекс.Трекера
 * Формат: PROJ-123, ABC-456, TEST-1
 */
export const IssueKeySchema = z
  .string()
  .regex(
    /^[A-Z][A-Z0-9]+-\d+$/,
    'Неверный формат ключа задачи. Ожидается формат: PROJ-123'
  )
  .describe('Ключ задачи в формате PROJ-123');

/**
 * Валидация массива ключей задач
 */
export const IssueKeysSchema = z
  .array(IssueKeySchema)
  .min(1, 'Необходимо указать хотя бы один ключ задачи')
  .describe('Массив ключей задач');

/**
 * Вывод типа из схемы
 */
export type IssueKey = z.infer<typeof IssueKeySchema>;
export type IssueKeys = z.infer<typeof IssueKeysSchema>;
