/**
 * Zod схема для валидации параметров AddGoalKeyResultTool
 */

import { z } from 'zod';
import { FilteredEntitySchema, buildOutputSchema } from '#common/schemas/index.js';
import { KeyResultItemInputSchema } from './key-result-item.schema.js';

export const AddGoalKeyResultParamsSchema = z.object({
  /** Идентификатор цели (Goal) (обязательно) */
  goalId: z.string().min(1, 'Goal ID не может быть пустым'),

  /** Добавляемый key result (существующие id не меняются) (обязательно) */
  item: KeyResultItemInputSchema,
});

export type AddGoalKeyResultParams = z.infer<typeof AddGoalKeyResultParamsSchema>;

export const AddGoalKeyResultOutputDataSchema = z.object({
  goalId: z.string(),
  keyResults: z.array(FilteredEntitySchema),
  count: z.number(),
});

export const AddGoalKeyResultOutputSchema = buildOutputSchema(AddGoalKeyResultOutputDataSchema);
