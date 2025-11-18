/**
 * Zod схема для валидации параметров UpdateComponentTool
 */

import { z } from 'zod';

/**
 * Схема параметров для обновления компонента
 */
export const UpdateComponentParamsSchema = z.object({
  /**
   * ID компонента
   */
  componentId: z.string().min(1, 'Component ID обязателен'),

  /**
   * Новое название компонента (опционально)
   */
  name: z.string().min(1).optional(),

  /**
   * Новое описание компонента (опционально)
   */
  description: z.string().optional(),

  /**
   * Новый руководитель компонента (опционально)
   */
  lead: z.string().optional(),

  /**
   * Автоматическое назначение задач (опционально)
   */
  assignAuto: z.boolean().optional(),
});

/**
 * Вывод типа из схемы
 */
export type UpdateComponentParams = z.infer<typeof UpdateComponentParamsSchema>;
