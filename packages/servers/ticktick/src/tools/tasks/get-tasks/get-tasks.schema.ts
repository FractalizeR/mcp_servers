/**
 * Zod schema for GetTasksTool parameters (batch)
 */

import { z } from 'zod';
import { FieldsSchema, TaskRefsSchema } from '#common/schemas/index.js';

/**
 * Parameters schema for getting multiple tasks
 */
export const GetTasksParamsSchema = z.object({
  tasks: TaskRefsSchema.describe('List of tasks to fetch (projectId + taskId pairs)'),
  fields: FieldsSchema,
});

/**
 * Type inference from schema
 */
export type GetTasksParams = z.infer<typeof GetTasksParamsSchema>;
