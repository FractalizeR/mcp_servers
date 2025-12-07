/**
 * Zod schema for BatchCreateTasksTool parameters
 */

import { z } from 'zod';
import { OptionalFieldsSchema, OptionalPrioritySchema } from '#common/schemas/index.js';

/**
 * Single task schema for batch creation
 */
const BatchTaskSchema = z.object({
  title: z.string().min(1).max(500).describe('Task title (required)'),
  projectId: z.string().optional().describe('Project ID (defaults to Inbox)'),
  content: z.string().optional().describe('Task description/content'),
  priority: OptionalPrioritySchema,
  dueDate: z.string().optional().describe('Due date in ISO format'),
});

/**
 * Parameters schema for batch creating tasks
 */
export const BatchCreateTasksParamsSchema = z.object({
  tasks: z
    .array(BatchTaskSchema)
    .min(1, 'At least one task is required')
    .max(50, 'Maximum 50 tasks per batch request')
    .describe('Tasks to create (max 50)'),
  fields: OptionalFieldsSchema,
});

/**
 * Type inference from schema
 */
export type BatchCreateTasksParams = z.infer<typeof BatchCreateTasksParamsSchema>;
