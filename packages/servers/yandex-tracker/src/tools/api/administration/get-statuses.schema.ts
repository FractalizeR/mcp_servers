/**
 * Zod схема для валидации параметров GetStatusesTool
 */

import { z } from 'zod';
import {
  FieldsSchema,
  FilteredEntitySchema,
  FieldsReturnedSchema,
  buildOutputSchema,
} from '#common/schemas/index.js';

export const GetStatusesParamsSchema = z.object({
  /** Список полей для возврата (обязательно) */
  fields: FieldsSchema,
});

export type GetStatusesParams = z.infer<typeof GetStatusesParamsSchema>;

export const GetStatusesOutputDataSchema = z.object({
  statuses: z.array(FilteredEntitySchema),
  count: z.number(),
  fieldsReturned: FieldsReturnedSchema,
});

export const GetStatusesOutputSchema = buildOutputSchema(GetStatusesOutputDataSchema);
