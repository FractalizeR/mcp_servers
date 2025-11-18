/**
 * Zod схема для валидации параметров DeleteProjectTool
 */

import { z } from 'zod';

/**
 * Схема параметров для удаления проекта
 */
export const DeleteProjectParamsSchema = z.object({
  /**
   * ID или ключ проекта (обязательно)
   */
  projectId: z.string().min(1, 'ID проекта не может быть пустым'),
});

/**
 * Вывод типа из схемы
 */
export type DeleteProjectParams = z.infer<typeof DeleteProjectParamsSchema>;
