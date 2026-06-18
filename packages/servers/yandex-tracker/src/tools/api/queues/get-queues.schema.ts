/**
 * Zod схема для валидации параметров GetQueuesTool
 */

import { z } from 'zod';
import { FieldsSchema, PageSchema, makePerPageSchema } from '#common/schemas/index.js';

/**
 * Схема параметров для получения списка очередей
 */
export const GetQueuesParamsSchema = z.object({
  /**
   * Количество записей на странице (опционально, потолок 100)
   */
  perPage: makePerPageSchema(100),

  /**
   * Номер страницы (опционально, начинается с 1)
   */
  page: PageSchema,

  /**
   * Дополнительные поля для включения в ответ (опционально)
   */
  expand: z.string().optional(),

  /**
   * Список полей для возврата (обязательно)
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type GetQueuesParams = z.infer<typeof GetQueuesParamsSchema>;
