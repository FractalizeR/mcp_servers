/**
 * Zod схема для валидации параметров GetBoardsTool
 */

import { z } from 'zod';
import { FieldsSchema, FilteredEntitySchema, buildOutputSchema } from '#common/schemas/index.js';

/**
 * Схема параметров для получения списка досок.
 *
 * ВАЖНО: эндпоинт досок НЕ пагинируется (API возвращает все доски одним
 * ответом), поэтому пагинационных параметров у этого инструмента нет —
 * аналогично get_components.
 */
export const GetBoardsParamsSchema = z.object({
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
export type GetBoardsParams = z.infer<typeof GetBoardsParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const GetBoardsOutputDataSchema = z.object({
  boards: z.array(FilteredEntitySchema),
  count: z.number(),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const GetBoardsOutputSchema = buildOutputSchema(GetBoardsOutputDataSchema);
