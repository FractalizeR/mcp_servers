/**
 * Zod схема для валидации параметров SetGoalKeyResultsTool
 */

import { z } from 'zod';
import { FilteredEntitySchema, buildOutputSchema } from '#common/schemas/index.js';
import { KeyResultItemInputSchema } from './key-result-item.schema.js';

export const SetGoalKeyResultsParamsSchema = z.object({
  /** Идентификатор цели (Goal) (обязательно) */
  goalId: z.string().min(1, 'Goal ID не может быть пустым'),

  /**
   * Полный список key results — заменяет прежний список ЦЕЛИКОМ (обязательно).
   * ВАЖНО: API перегенерирует id всех элементов при замене (даже неизменившихся).
   * Чтобы удалить один key result, передайте список без него.
   */
  items: z.array(KeyResultItemInputSchema).min(1, 'Список key results не может быть пустым'),
});

export type SetGoalKeyResultsParams = z.infer<typeof SetGoalKeyResultsParamsSchema>;

export const SetGoalKeyResultsOutputDataSchema = z.object({
  goalId: z.string(),
  keyResults: z.array(FilteredEntitySchema),
  count: z.number(),
});

export const SetGoalKeyResultsOutputSchema = buildOutputSchema(SetGoalKeyResultsOutputDataSchema);
