/**
 * Schema for GetNextTasks tool
 */

import { z } from 'zod';
import {
  FieldsSchema,
  TaskEntityOutputSchema,
  buildSuccessOutputSchema,
} from '#tools/shared/index.js';

export const GetNextTasksParamsSchema = z.object({
  fields: FieldsSchema.describe('Поля для возврата'),
});

export type GetNextTasksParams = z.infer<typeof GetNextTasksParamsSchema>;

/**
 * Shape of `data` in the success envelope (`{ success: true, data }`)
 */
export const GetNextTasksOutputDataSchema = z.object({
  description: z.string(),
  mediumPriorityCount: z.number(),
  dueTomorrowCount: z.number(),
  tomorrowDate: z.string(),
  total: z.number(),
  tasks: z.array(TaskEntityOutputSchema),
  fieldsReturned: z.union([z.array(z.string()), z.literal('all')]),
});

/**
 * outputSchema (JSON Schema 2020-12) — describes the whole success envelope,
 * not just `data` (see base-tool.ts SuccessEnvelope).
 */
export const GET_NEXT_TASKS_OUTPUT_SCHEMA = buildSuccessOutputSchema(GetNextTasksOutputDataSchema);
