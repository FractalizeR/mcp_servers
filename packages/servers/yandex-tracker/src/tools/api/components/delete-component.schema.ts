/**
 * Zod схема для валидации параметров DeleteComponentTool
 */

import { z } from 'zod';

/**
 * Схема параметров для удаления компонента
 */
export const DeleteComponentParamsSchema = z.object({
  /**
   * ID компонента для удаления
   */
  componentId: z.string().min(1, 'Component ID обязателен'),
});

/**
 * Вывод типа из схемы
 */
export type DeleteComponentParams = z.infer<typeof DeleteComponentParamsSchema>;
