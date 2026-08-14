/**
 * Schema for GetTasksDueThisWeek tool
 */

import { z } from 'zod';
import { FieldsSchema, TaskEntityOutputSchema } from '#tools/shared/index.js';
import { buildOutputSchema } from '@fractalizer/mcp-core';
export const GetTasksDueThisWeekParamsSchema = z.object({
  fields: FieldsSchema.describe('Поля для возврата'),
});

export type GetTasksDueThisWeekParams = z.infer<typeof GetTasksDueThisWeekParamsSchema>;

/**
 * Shape of `data` in the success envelope (`{ success: true, data }`)
 */
export const GetTasksDueThisWeekOutputDataSchema = z.object({
  weekStart: z.string(),
  weekEnd: z.string(),
  total: z.number(),
  tasks: z.array(TaskEntityOutputSchema),
  fieldsReturned: z.union([z.array(z.string()), z.literal('all')]),
});

/**
 * outputSchema (JSON Schema 2020-12) — describes the whole success envelope,
 * not just `data` (see base-tool.ts SuccessEnvelope).
 */
export const GET_TASKS_DUE_THIS_WEEK_OUTPUT_SCHEMA = buildOutputSchema(
  GetTasksDueThisWeekOutputDataSchema
);
