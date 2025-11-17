/**
 * Zod схема для валидации параметров FindIssuesTool
 */

import { z } from 'zod';
import { FieldsSchema } from '../../../../common/schemas/index.js';

/**
 * Схема параметров для поиска задач
 *
 * ВАЖНО: Хотя бы один из способов поиска должен быть указан
 */
export const FindIssuesParamsSchema = z
  .object({
    /**
     * Язык запросов Трекера (query language)
     * Пример: "Author: me() Resolution: empty()"
     */
    query: z.string().optional(),

    /**
     * Фильтр по полям (объект key-value)
     * Пример: { queue: "PROJ", status: "open" }
     */
    filter: z.record(z.string(), z.unknown()).optional(),

    /**
     * Список ключей задач
     * Пример: ["PROJ-1", "PROJ-2"]
     */
    keys: z.array(z.string()).optional(),

    /**
     * Ключ очереди
     * Пример: "DEVOPS"
     */
    queue: z.string().optional(),

    /**
     * ID сохранённого фильтра
     */
    filterId: z.string().optional(),

    /**
     * Сортировка результатов
     * Формат: ["+field1", "-field2"]
     * Пример: ["+created", "-priority"]
     */
    order: z.array(z.string()).optional(),

    /**
     * Количество результатов на странице
     */
    perPage: z.number().int().positive().optional(),

    /**
     * Номер страницы
     */
    page: z.number().int().positive().optional(),

    /**
     * Расширение ответа дополнительными полями
     * Возможные значения: "transitions", "attachments"
     */
    expand: z.array(z.string()).optional(),

    /**
     * Опциональный массив полей для фильтрации ответа
     */
    fields: FieldsSchema,
  })
  .refine(
    (data) => {
      // Проверка: хотя бы один способ поиска должен быть указан
      return (
        data.query !== undefined ||
        data.filter !== undefined ||
        (data.keys !== undefined && data.keys.length > 0) ||
        data.queue !== undefined ||
        data.filterId !== undefined
      );
    },
    {
      message:
        'Должен быть указан хотя бы один способ поиска: query, filter, keys, queue или filterId',
    }
  );

/**
 * Вывод типа из схемы
 */
export type FindIssuesParams = z.infer<typeof FindIssuesParamsSchema>;
