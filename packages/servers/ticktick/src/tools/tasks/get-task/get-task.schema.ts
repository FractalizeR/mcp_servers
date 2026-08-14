/**
 * Zod schema for GetTaskTool parameters
 */

import { z } from 'zod';
import { FieldsSchema } from '#common/schemas/index.js';
import { TaskEntityOutputSchema } from '#tools/shared/index.js';
import { buildOutputSchema } from '@fractalizer/mcp-core';
/**
 * Parameters schema for getting a single task
 */
export const GetTaskParamsSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required').describe('ID of the project'),
  taskId: z.string().min(1, 'Task ID is required').describe('ID of the task'),
  fields: FieldsSchema,
});

/**
 * Type inference from schema
 */
export type GetTaskParams = z.infer<typeof GetTaskParamsSchema>;

/**
 * Shape of `data` in the success envelope (`{ success: true, data }`)
 */
export const GetTaskOutputDataSchema = z.object({
  task: TaskEntityOutputSchema,
  fieldsReturned: z.array(z.string()),
});

/**
 * outputSchema (JSON Schema 2020-12) for GetTaskTool — describes the whole
 * success envelope, not just `data` (see base-tool.ts SuccessEnvelope).
 */
export const GET_TASK_OUTPUT_SCHEMA = buildOutputSchema(GetTaskOutputDataSchema);
