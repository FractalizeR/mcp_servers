/**
 * Zod схема для валидации параметров GetSprintTool
 */

import { z } from 'zod';
import {
  FieldsSchema,
  FilteredEntitySchema,
  FieldsReturnedSchema,
  buildOutputSchema,
} from '#common/schemas/index.js';

export const GetSprintParamsSchema = z.object({
  /** Идентификатор спринта (обязательно) */
  sprintId: z.string().min(1, 'Sprint ID не может быть пустым'),

  /** Список полей для возврата (обязательный) */
  fields: FieldsSchema,
});

export type GetSprintParams = z.infer<typeof GetSprintParamsSchema>;

export const GetSprintOutputDataSchema = z.object({
  sprint: FilteredEntitySchema,
  fieldsReturned: FieldsReturnedSchema,
});

export const GetSprintOutputSchema = buildOutputSchema(GetSprintOutputDataSchema);
