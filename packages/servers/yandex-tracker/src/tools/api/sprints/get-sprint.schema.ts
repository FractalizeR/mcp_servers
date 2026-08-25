/**
 * Zod схема для валидации параметров GetSprintTool
 */

import { z } from 'zod';
import {
  FieldsSchema,
  FilteredEntitySchema,
  buildOutputSchema,
  buildEntityIdSchema,
} from '#common/schemas/index.js';

export const GetSprintParamsSchema = z.object({
  /** Идентификатор спринта (обязательно) */
  sprintId: buildEntityIdSchema('Sprint'),

  /** Список полей для возврата (обязательный) */
  fields: FieldsSchema,
});

export type GetSprintParams = z.infer<typeof GetSprintParamsSchema>;

export const GetSprintOutputDataSchema = z.object({
  sprint: FilteredEntitySchema,
});

export const GetSprintOutputSchema = buildOutputSchema(GetSprintOutputDataSchema);
