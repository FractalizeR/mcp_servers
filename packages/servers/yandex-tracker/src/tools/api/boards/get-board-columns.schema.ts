/**
 * Zod схема для валидации параметров GetBoardColumnsTool
 */

import { z } from 'zod';
import {
  FieldsSchema,
  FilteredEntitySchema,
  buildOutputSchema,
  buildEntityIdSchema,
} from '#common/schemas/index.js';

/** ВАЖНО: эндпоинт не пагинируется (небольшой набор колонок доски). */
export const GetBoardColumnsParamsSchema = z.object({
  /** Идентификатор доски (обязательно) */
  boardId: buildEntityIdSchema('Board'),

  /** Список полей для возврата (обязательно) */
  fields: FieldsSchema,
});

export type GetBoardColumnsParams = z.infer<typeof GetBoardColumnsParamsSchema>;

export const GetBoardColumnsOutputDataSchema = z.object({
  columns: z.array(FilteredEntitySchema),
  count: z.number(),
  boardId: z.string(),
});

export const GetBoardColumnsOutputSchema = buildOutputSchema(GetBoardColumnsOutputDataSchema);
