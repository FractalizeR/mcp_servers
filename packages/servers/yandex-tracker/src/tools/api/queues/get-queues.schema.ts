/**
 * Zod схема для валидации параметров GetQueuesTool
 */

import { z } from 'zod';
import { FieldsSchema } from '../../../common/schemas/index.js';

/**
 * Схема параметров для получения списка очередей
 */
export const GetQueuesParamsSchema = z.object({
  /**
   * Количество записей на странице (опционально, по умолчанию 50)
   */
  perPage: z.number().int().positive().max(100).optional(),

  /**
   * Номер страницы (опционально, начинается с 1)
   */
  page: z.number().int().positive().optional(),

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
