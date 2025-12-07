/**
 * Zod schema for task reference (projectId + taskId pair)
 *
 * Used in batch operations where multiple tasks need to be referenced.
 */

import { z } from 'zod';

/**
 * Single task reference schema
 */
export const TaskRefSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  taskId: z.string().min(1, 'Task ID is required'),
});

export type TaskRef = z.infer<typeof TaskRefSchema>;

/**
 * Array of task references for batch operations
 */
export const TaskRefsSchema = z
  .array(TaskRefSchema)
  .min(1, 'At least one task reference is required')
  .max(100, 'Maximum 100 tasks per batch request')
  .describe('List of tasks to fetch (projectId + taskId pairs)');

export type TaskRefs = z.infer<typeof TaskRefsSchema>;
