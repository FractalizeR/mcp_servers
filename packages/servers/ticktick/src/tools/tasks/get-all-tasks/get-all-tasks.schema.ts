/**
 * Zod schema for GetAllTasksTool parameters
 */

import { z } from 'zod';
import { TaskEntityOutputSchema } from '#tools/shared/index.js';
import { FieldsSchema, StatusFilterSchema } from '#common/schemas/index.js';
import { buildOutputSchema } from '@fractalizer/mcp-core';

/**
 * Parameters schema for getting all tasks
 */
export const GetAllTasksParamsSchema = z.object({
  fields: FieldsSchema,
  status: StatusFilterSchema,
});

/**
 * Type inference from schema
 */
export type GetAllTasksParams = z.infer<typeof GetAllTasksParamsSchema>;

/**
 * Shape of `data` in the success envelope (`{ success: true, data }`)
 */
export const GetAllTasksOutputDataSchema = z.object({
  total: z.number(),
  status: z.enum(['all', 'uncompleted', 'completed']),
  tasks: z.array(TaskEntityOutputSchema),
  fieldsReturned: z.array(z.string()),
});

/**
 * outputSchema (JSON Schema 2020-12) — describes the whole success envelope,
 * not just `data` (see base-tool.ts SuccessEnvelope).
 */
export const GET_ALL_TASKS_OUTPUT_SCHEMA = buildOutputSchema(GetAllTasksOutputDataSchema);
