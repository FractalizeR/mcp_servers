/**
 * Zod схема для валидации параметров GetIssueTypesTool
 */

import { z } from 'zod';
import {
  FieldsSchema,
  FilteredEntitySchema,
  FieldsReturnedSchema,
  buildOutputSchema,
} from '#common/schemas/index.js';

export const GetIssueTypesParamsSchema = z.object({
  /** Список полей для возврата (обязательно) */
  fields: FieldsSchema,
});

export type GetIssueTypesParams = z.infer<typeof GetIssueTypesParamsSchema>;

export const GetIssueTypesOutputDataSchema = z.object({
  issueTypes: z.array(FilteredEntitySchema),
  count: z.number(),
  fieldsReturned: FieldsReturnedSchema,
});

export const GetIssueTypesOutputSchema = buildOutputSchema(GetIssueTypesOutputDataSchema);
