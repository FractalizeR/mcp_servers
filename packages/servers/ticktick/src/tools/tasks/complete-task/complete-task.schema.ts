/**
 * Zod schema for CompleteTaskTool parameters
 */

import { z } from 'zod';

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
