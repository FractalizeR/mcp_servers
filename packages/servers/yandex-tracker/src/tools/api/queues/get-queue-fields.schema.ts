/**
 * Zod схема для валидации параметров GetQueueFieldsTool
 */

import { z } from 'zod';

/**
 * Схема параметров для получения полей очереди
 */
export const GetQueueFieldsParamsSchema = z.object({
  /**
   * Идентификатор или ключ очереди (обязательно)
   */
  queueId: z.string().min(1, 'Queue ID не может быть пустым'),
});

/**
 * Вывод типа из схемы
 */
export type GetQueueFieldsParams = z.infer<typeof GetQueueFieldsParamsSchema>;
