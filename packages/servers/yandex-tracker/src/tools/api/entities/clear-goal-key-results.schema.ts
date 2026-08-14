/**
 * Zod схема для валидации параметров ClearGoalKeyResultsTool
 */

import { z } from 'zod';
import { buildOutputSchema } from '#common/schemas/index.js';

export const ClearGoalKeyResultsParamsSchema = z.object({
  /** Идентификатор цели (Goal) (обязательно) */
  goalId: z.string().min(1, 'Goal ID не может быть пустым'),
});

export type ClearGoalKeyResultsParams = z.infer<typeof ClearGoalKeyResultsParamsSchema>;

export const ClearGoalKeyResultsOutputDataSchema = z.object({
  success: z.literal(true),
  goalId: z.string(),
  message: z.string(),
});

export const ClearGoalKeyResultsOutputSchema = buildOutputSchema(
  ClearGoalKeyResultsOutputDataSchema
);
