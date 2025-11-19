/**
 * Zod схема для валидации параметров GetComponentsTool
 */

import { z } from 'zod';
import { FieldsSchema } from '../../../common/schemas/index.js';

/**
 * Схема параметров для получения списка компонентов очереди
 */
export const GetComponentsParamsSchema = z.object({
  /**
   * ID или ключ очереди
   */
  queueId: z.string().min(1, 'Queue ID обязателен'),

  /**
   * Массив полей для возврата в результате (обязательный)
   * Примеры: ['id', 'name'], ['id', 'name', 'description', 'lead.login']
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type GetComponentsParams = z.infer<typeof GetComponentsParamsSchema>;
