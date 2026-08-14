/**
 * Zod схема для валидации параметров DeleteComponentTool
 */

import { z } from 'zod';
import { buildOutputSchema } from '#common/schemas/index.js';

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

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const DeleteComponentOutputDataSchema = z.object({
  success: z.literal(true),
  componentId: z.string(),
  message: z.string(),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const DeleteComponentOutputSchema = buildOutputSchema(DeleteComponentOutputDataSchema);
