/**
 * Schema for GetEngagedTasks tool
 */

import { z } from 'zod';
import { FieldsSchema, TaskEntityOutputSchema } from '#tools/shared/index.js';
import { buildOutputSchema } from '@fractalizer/mcp-core';
export const GetEngagedTasksParamsSchema = z.object({
  fields: FieldsSchema.describe('Поля для возврата'),
});

export type GetEngagedTasksParams = z.infer<typeof GetEngagedTasksParamsSchema>;

/**
 * Shape of `data` in the success envelope (`{ success: true, data }`)
 */
export const GetEngagedTasksOutputDataSchema = z.object({
  description: z.string(),
  highPriorityCount: z.number(),
  overdueCount: z.number(),
  total: z.number(),
  tasks: z.array(TaskEntityOutputSchema),
  fieldsReturned: z.union([z.array(z.string()), z.literal('all')]),
});

/**
 * outputSchema (JSON Schema 2020-12) — describes the whole success envelope,
 * not just `data` (see base-tool.ts SuccessEnvelope).
 */
export const GET_ENGAGED_TASKS_OUTPUT_SCHEMA = buildOutputSchema(GetEngagedTasksOutputDataSchema);
