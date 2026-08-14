/**
 * Zod схема для валидации параметров DeleteProjectTool
 */

import { z } from 'zod';
import { buildOutputSchema } from '#common/schemas/index.js';

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

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const DeleteProjectOutputDataSchema = z.object({
  message: z.string(),
  projectId: z.string(),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const DeleteProjectOutputSchema = buildOutputSchema(DeleteProjectOutputDataSchema);
