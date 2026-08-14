/**
 * Zod schema for GetTasksByPriorityTool parameters
 */

import { z } from 'zod';
import { TaskEntityOutputSchema } from '#tools/shared/index.js';
import { FieldsSchema, PrioritySchema } from '#common/schemas/index.js';
import { buildOutputSchema } from '@fractalizer/mcp-core';

/**
 * Parameters schema for getting tasks by priority
 */
export const GetTasksByPriorityParamsSchema = z.object({
  priority: PrioritySchema,
  fields: FieldsSchema,
});

/**
 * Type inference from schema
 */
export type GetTasksByPriorityParams = z.infer<typeof GetTasksByPriorityParamsSchema>;

/**
 * Shape of `data` in the success envelope (`{ success: true, data }`)
 */
export const GetTasksByPriorityOutputDataSchema = z.object({
  priority: z.number(),
  priorityLabel: z.string(),
  total: z.number(),
  tasks: z.array(TaskEntityOutputSchema),
  fieldsReturned: z.array(z.string()),
});

/**
 * outputSchema (JSON Schema 2020-12) — describes the whole success envelope,
 * not just `data` (see base-tool.ts SuccessEnvelope).
 */
export const GET_TASKS_BY_PRIORITY_OUTPUT_SCHEMA = buildOutputSchema(
  GetTasksByPriorityOutputDataSchema
);
