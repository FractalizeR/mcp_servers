/**
 * Zod schema for UpdateTaskTool parameters
 */

import { z } from 'zod';
import { TaskEntityOutputSchema, buildSuccessOutputSchema } from '#tools/shared/index.js';
import { OptionalFieldsSchema, OptionalPrioritySchema } from '#common/schemas/index.js';

/**
 * Parameters schema for updating a task
 */
export const UpdateTaskParamsSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required').describe('ID of the project'),
  taskId: z.string().min(1, 'Task ID is required').describe('ID of the task'),
  title: z.string().min(1).max(500).optional().describe('New title'),
  content: z.string().optional().describe('New description/content'),
  priority: OptionalPrioritySchema.describe('New priority'),
  dueDate: z.string().nullable().optional().describe('New due date (null to remove)'),
  tags: z.array(z.string()).optional().describe('New tags'),
  fields: OptionalFieldsSchema,
});

/**
 * Type inference from schema
 */
export type UpdateTaskParams = z.infer<typeof UpdateTaskParamsSchema>;

/**
 * Shape of `data` in the success envelope (`{ success: true, data }`)
 */
export const UpdateTaskOutputDataSchema = z.object({
  message: z.string(),
  task: TaskEntityOutputSchema,
  fieldsReturned: z.array(z.string()),
});

/**
 * outputSchema (JSON Schema 2020-12) — describes the whole success envelope,
 * not just `data` (see base-tool.ts SuccessEnvelope).
 */
export const UPDATE_TASK_OUTPUT_SCHEMA = buildSuccessOutputSchema(UpdateTaskOutputDataSchema);
