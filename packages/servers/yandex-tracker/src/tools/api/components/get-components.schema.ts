/**
 * Zod схема для валидации параметров GetComponentsTool
 */

import { z } from 'zod';

/**
 * Схема параметров для получения списка компонентов очереди
 */
export const GetComponentsParamsSchema = z.object({
  /**
   * ID или ключ очереди
   */
  queueId: z.string().min(1, 'Queue ID обязателен'),
});

/**
 * Вывод типа из схемы
 */
export type GetComponentsParams = z.infer<typeof GetComponentsParamsSchema>;
