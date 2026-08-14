/**
 * Zod схема для валидации параметров GetResolutionsTool
 */

import { z } from 'zod';
import {
  FieldsSchema,
  FilteredEntitySchema,
  FieldsReturnedSchema,
  buildOutputSchema,
} from '#common/schemas/index.js';

export const GetResolutionsParamsSchema = z.object({
  /** Список полей для возврата (обязательно) */
  fields: FieldsSchema,
});

export type GetResolutionsParams = z.infer<typeof GetResolutionsParamsSchema>;

export const GetResolutionsOutputDataSchema = z.object({
  resolutions: z.array(FilteredEntitySchema),
  count: z.number(),
  fieldsReturned: FieldsReturnedSchema,
});

export const GetResolutionsOutputSchema = buildOutputSchema(GetResolutionsOutputDataSchema);
