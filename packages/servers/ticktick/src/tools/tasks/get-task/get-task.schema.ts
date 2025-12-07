/**
 * Zod schema for GetTaskTool parameters
 */

import { z } from 'zod';
import { FieldsSchema } from '#common/schemas/index.js';

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
