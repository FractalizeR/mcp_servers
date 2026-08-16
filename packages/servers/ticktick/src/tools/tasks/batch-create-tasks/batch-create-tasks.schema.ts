/**
 * Zod schema for BatchCreateTasksTool parameters
 */

import { z } from 'zod';
import { TaskEntityOutputSchema } from '#tools/shared/index.js';
import { OptionalFieldsSchema, OptionalPrioritySchema } from '#common/schemas/index.js';
import { buildOutputSchema } from '@fractalizer/mcp-core';

/**
 * Single task schema for batch creation
 */
const BatchTaskSchema = z.object({
  title: z.string().min(1).max(500).describe('Заголовок задачи (обязательно)'),
  projectId: z.string().optional().describe('Project ID (defaults to Inbox)'),
  content: z.string().optional().describe('Описание/содержимое задачи'),
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
    .describe('Задачи для создания (до 50)'),
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
export const BATCH_CREATE_TASKS_OUTPUT_SCHEMA = buildOutputSchema(BatchCreateTasksOutputDataSchema);
