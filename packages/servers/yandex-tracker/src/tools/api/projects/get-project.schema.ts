/**
 * Zod схема для валидации параметров GetProjectTool
 */

import { z } from 'zod';

/**
 * Схема параметров для получения одного проекта
 */
export const GetProjectParamsSchema = z.object({
  /**
   * Идентификатор или ключ проекта (обязательно)
   */
  projectId: z.string().min(1, 'Project ID не может быть пустым'),

  /**
   * Дополнительные поля для включения в ответ (опционально)
   */
  expand: z.string().optional(),
});

/**
 * Вывод типа из схемы
 */
export type GetProjectParams = z.infer<typeof GetProjectParamsSchema>;
