/**
 * Zod схема для валидации параметров GetBoardTool
 */

import { z } from 'zod';
import {
  FieldsSchema,
  FilteredEntitySchema,
  buildOutputSchema,
  buildEntityIdSchema,
} from '#common/schemas/index.js';

/**
 * Схема параметров для получения одной доски
 */
export const GetBoardParamsSchema = z.object({
  /**
   * Идентификатор доски (обязательно)
   */
  boardId: buildEntityIdSchema('Board'),

  /**
   * Локализация полей (опционально)
   */
  localized: z.boolean().optional(),

  /**
   * Список полей для возврата (обязательный)
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type GetBoardParams = z.infer<typeof GetBoardParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const GetBoardOutputDataSchema = z.object({
  board: FilteredEntitySchema,
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const GetBoardOutputSchema = buildOutputSchema(GetBoardOutputDataSchema);
