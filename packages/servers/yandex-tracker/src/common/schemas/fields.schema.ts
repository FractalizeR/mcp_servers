/**
 * Zod схемы для валидации параметра fields (фильтрация полей ответа)
 *
 * Доменная версия для Yandex Tracker с описанием конкретных полей
 *
 * ВАЖНО: Этот параметр ОБЯЗАТЕЛЕН (не optional) для всех tools,
 * возвращающих объекты API. Это критично для экономии контекста MCP.
 */

import { z } from 'zod';

/**
 * Валидация ОБЯЗАТЕЛЬНОГО массива полей для фильтрации ответа
 *
 * Примеры полей Яндекс.Трекера:
 * - key, summary, description, status, assignee
 * - createdAt, updatedAt, dueDate
 * - queue, project, epic
 * - assignee.display, status.key (вложенные поля через dot-notation)
 *
 * @example
 * // Правильно
 * fields: ['key', 'summary', 'assignee.display']
 *
 * // ОШИБКА - пустой массив
 * fields: []
 *
 * // ОШИБКА - поле не указано
 * // fields отсутствует
 */
export const FieldsSchema = z
  .array(z.string().min(1, 'Имя поля не может быть пустым'))
  .min(1, 'Параметр fields обязателен и должен содержать минимум 1 поле')
  .describe(
    'Список полей для возврата (ОБЯЗАТЕЛЬНЫЙ). ' +
      'Укажите минимум одно поле для экономии контекста MCP. ' +
      'Поддерживается dot-notation для вложенных полей.'
  );

/**
 * Вывод типа из схемы
 */
export type Fields = z.infer<typeof FieldsSchema>;
