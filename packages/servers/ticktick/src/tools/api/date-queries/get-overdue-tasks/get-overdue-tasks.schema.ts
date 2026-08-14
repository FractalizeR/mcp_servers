/**
 * Schema for GetOverdueTasks tool
 */

import { z } from 'zod';
import {
  FieldsSchema,
  TaskEntityOutputSchema,
  buildSuccessOutputSchema,
} from '#tools/shared/index.js';

export const GetOverdueTasksParamsSchema = z.object({
  fields: FieldsSchema.describe('Поля для возврата'),
});

export type GetOverdueTasksParams = z.infer<typeof GetOverdueTasksParamsSchema>;

/**
 * Shape of `data` in the success envelope (`{ success: true, data }`)
 */
export const GetOverdueTasksOutputDataSchema = z.object({
  asOf: z.string(),
  total: z.number(),
  tasks: z.array(TaskEntityOutputSchema),
  fieldsReturned: z.union([z.array(z.string()), z.literal('all')]),
  note: z.string(),
});

/**
 * outputSchema (JSON Schema 2020-12) — describes the whole success envelope,
 * not just `data` (see base-tool.ts SuccessEnvelope).
 */
export const GET_OVERDUE_TASKS_OUTPUT_SCHEMA = buildSuccessOutputSchema(
  GetOverdueTasksOutputDataSchema
);
