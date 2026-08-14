/**
 * Zod схема для валидации параметров GetGoalKeyResultsTool
 */

import { z } from 'zod';
import { FieldsSchema, FilteredEntitySchema, buildOutputSchema } from '#common/schemas/index.js';

export const GetGoalKeyResultsParamsSchema = z.object({
  /** Идентификатор цели (Goal) (обязательно) */
  goalId: z.string().min(1, 'Goal ID не может быть пустым'),

  /** Список полей для возврата у каждого key result (обязательно) */
  fields: FieldsSchema,
});

export type GetGoalKeyResultsParams = z.infer<typeof GetGoalKeyResultsParamsSchema>;

export const GetGoalKeyResultsOutputDataSchema = z.object({
  goalId: z.string(),
  keyResults: z.array(FilteredEntitySchema),
  count: z.number(),
});

export const GetGoalKeyResultsOutputSchema = buildOutputSchema(GetGoalKeyResultsOutputDataSchema);
