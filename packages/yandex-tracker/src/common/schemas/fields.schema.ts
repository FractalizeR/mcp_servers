/**
 * Zod схемы для валидации параметра fields (фильтрация полей ответа)
 *
 * Доменная версия для Yandex Tracker с описанием конкретных полей
 */

import { z } from 'zod';

/**
 * Валидация массива полей для фильтрации ответа
 *
 * Примеры полей Яндекс.Трекера:
 * - key, summary, description, status, assignee
 * - createdAt, updatedAt, dueDate
 * - queue, project, epic
 */
export const FieldsSchema = z
  .array(z.string().min(1, 'Имя поля не может быть пустым'))
  .optional()
  .describe(
    'Список полей для возврата. Если не указано, возвращаются все доступные поля. ' +
      'Позволяет существенно уменьшить размер ответа.'
  );

/**
 * Вывод типа из схемы
 */
export type Fields = z.infer<typeof FieldsSchema>;
