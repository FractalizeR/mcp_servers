/**
 * Zod схема для валидации параметров GetPrioritiesTool
 */

import { z } from 'zod';
import { FieldsSchema, FilteredEntitySchema, buildOutputSchema } from '#common/schemas/index.js';

export const GetPrioritiesParamsSchema = z.object({
  /** Список полей для возврата (обязательно) */
  fields: FieldsSchema,
});

export type GetPrioritiesParams = z.infer<typeof GetPrioritiesParamsSchema>;

export const GetPrioritiesOutputDataSchema = z.object({
  priorities: z.array(FilteredEntitySchema),
  count: z.number(),
});

export const GetPrioritiesOutputSchema = buildOutputSchema(GetPrioritiesOutputDataSchema);
