/**
 * Zod схема для валидации параметров GetSprintsTool
 */

import { z } from 'zod';
import { FieldsSchema, FilteredEntitySchema, buildOutputSchema } from '#common/schemas/index.js';

/**
 * Схема параметров для получения списка спринтов доски.
 *
 * ВАЖНО: эндпоинт спринтов доски НЕ пагинируется в нашей реализации (весь
 * список отдаётся одним ответом) — аналогично get_components/get_boards.
 */
export const GetSprintsParamsSchema = z.object({
  /** Идентификатор доски (обязательно) */
  boardId: z.string().min(1, 'Board ID не может быть пустым'),

  /** Список полей для возврата (обязательный) */
  fields: FieldsSchema,
});

export type GetSprintsParams = z.infer<typeof GetSprintsParamsSchema>;

export const GetSprintsOutputDataSchema = z.object({
  sprints: z.array(FilteredEntitySchema),
  count: z.number(),
  boardId: z.string(),
});

export const GetSprintsOutputSchema = buildOutputSchema(GetSprintsOutputDataSchema);
