/**
 * Zod schema for CompleteTaskTool parameters
 */

import { z } from 'zod';
import { buildOutputSchema } from '@fractalizer/mcp-core';

/**
 * Parameters schema for completing a task
 */
export const CompleteTaskParamsSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required').describe('ID of the project'),
  taskId: z.string().min(1, 'Task ID is required').describe('ID of the task'),
});

/**
 * Type inference from schema
 */
export type CompleteTaskParams = z.infer<typeof CompleteTaskParamsSchema>;

/**
 * Shape of `data` in the success envelope (`{ success: true, data }`)
 */
export const CompleteTaskOutputDataSchema = z.object({
  message: z.string(),
  completedTaskId: z.string(),
  projectId: z.string(),
});

/**
 * outputSchema (JSON Schema 2020-12) — describes the whole success envelope,
 * not just `data` (see base-tool.ts SuccessEnvelope).
 */
export const COMPLETE_TASK_OUTPUT_SCHEMA = buildOutputSchema(CompleteTaskOutputDataSchema);
