/**
 * Zod schema for DeleteTaskTool parameters
 */

import { z } from 'zod';

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
