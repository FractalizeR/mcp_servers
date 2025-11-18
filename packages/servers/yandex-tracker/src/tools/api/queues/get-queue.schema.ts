/**
 * Zod схема для валидации параметров GetQueueTool
 */

import { z } from 'zod';

/**
 * Схема параметров для получения одной очереди
 */
export const GetQueueParamsSchema = z.object({
  /**
   * Идентификатор или ключ очереди (обязательно)
   */
  queueId: z.string().min(1, 'Queue ID не может быть пустым'),

  /**
   * Дополнительные поля для включения в ответ (опционально)
   */
  expand: z.string().optional(),
});

/**
 * Вывод типа из схемы
 */
export type GetQueueParams = z.infer<typeof GetQueueParamsSchema>;
