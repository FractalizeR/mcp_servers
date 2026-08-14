/**
 * Zod schema for BatchCreateTasksTool parameters
 */

import { z } from 'zod';
import { TaskEntityOutputSchema, buildSuccessOutputSchema } from '#tools/shared/index.js';
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

/**
 * Shape of `data` in the success envelope (`{ success: true, data }`)
 */
export const BatchCreateTasksOutputDataSchema = z.object({
  total: z.number(),
  successful: z.number(),
  failed: z.number(),
  tasks: z.array(TaskEntityOutputSchema),
  errors: z.array(
    z.object({
      index: z.number(),
      error: z.string(),
    })
  ),
  fieldsReturned: z.array(z.string()),
});

/**
 * outputSchema (JSON Schema 2020-12) — describes the whole success envelope,
 * not just `data` (see base-tool.ts SuccessEnvelope).
 */
export const BATCH_CREATE_TASKS_OUTPUT_SCHEMA = buildSuccessOutputSchema(
  BatchCreateTasksOutputDataSchema
);
