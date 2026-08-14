/**
 * Zod схема для валидации параметров DeleteBoardTool
 */

import { z } from 'zod';
import { buildOutputSchema } from '#common/schemas/index.js';

/**
 * Схема параметров для удаления доски
 */
export const DeleteBoardParamsSchema = z.object({
  /** Идентификатор доски для удаления (обязательно) */
  boardId: z.string().min(1, 'Board ID не может быть пустым'),
});

/**
 * Вывод типа из схемы
 */
export type DeleteBoardParams = z.infer<typeof DeleteBoardParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const DeleteBoardOutputDataSchema = z.object({
  success: z.literal(true),
  boardId: z.string(),
  message: z.string(),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const DeleteBoardOutputSchema = buildOutputSchema(DeleteBoardOutputDataSchema);
