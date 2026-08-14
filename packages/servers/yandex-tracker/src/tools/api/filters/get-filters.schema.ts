/**
 * Zod схема для валидации параметров GetFiltersTool
 */

import { z } from 'zod';
import {
  FieldsSchema,
  FilteredEntitySchema,
  FieldsReturnedSchema,
  buildOutputSchema,
} from '#common/schemas/index.js';

/**
 * ВАЖНО: эндпоинт не пагинируется в этом сервере (личный набор сохранённых
 * фильтров невелик) — аналогично get_components/get_boards.
 */
export const GetFiltersParamsSchema = z.object({
  /** Список полей для возврата (обязательно) */
  fields: FieldsSchema,
});

export type GetFiltersParams = z.infer<typeof GetFiltersParamsSchema>;

export const GetFiltersOutputDataSchema = z.object({
  filters: z.array(FilteredEntitySchema),
  count: z.number(),
  fieldsReturned: FieldsReturnedSchema,
});

export const GetFiltersOutputSchema = buildOutputSchema(GetFiltersOutputDataSchema);
