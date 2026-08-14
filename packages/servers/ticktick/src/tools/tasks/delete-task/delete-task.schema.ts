/**
 * Zod schema for DeleteTaskTool parameters
 */

import { z } from 'zod';
import { buildSuccessOutputSchema } from '#tools/shared/index.js';

/**
 * Parameters schema for deleting a task
 */
export const DeleteTaskParamsSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required').describe('ID of the project'),
  taskId: z.string().min(1, 'Task ID is required').describe('ID of the task'),
});

/**
 * Type inference from schema
 */
export type DeleteTaskParams = z.infer<typeof DeleteTaskParamsSchema>;

/**
 * Shape of `data` in the success envelope (`{ success: true, data }`)
 */
export const DeleteTaskOutputDataSchema = z.object({
  message: z.string(),
  deletedTaskId: z.string(),
  projectId: z.string(),
});

/**
 * outputSchema (JSON Schema 2020-12) — describes the whole success envelope,
 * not just `data` (see base-tool.ts SuccessEnvelope).
 */
export const DELETE_TASK_OUTPUT_SCHEMA = buildSuccessOutputSchema(DeleteTaskOutputDataSchema);
