/**
 * Zod schema for CreateTaskTool parameters
 */

import { z } from 'zod';
import { TaskEntityOutputSchema } from '#tools/shared/index.js';
import { OptionalFieldsSchema, OptionalPrioritySchema } from '#common/schemas/index.js';
import { buildOutputSchema } from '@fractalizer/mcp-core';

/**
 * Checklist item schema for subtasks
 */
const ChecklistItemSchema = z.object({
  title: z.string().min(1, 'Subtask title is required'),
});

/**
 * Parameters schema for creating a task
 */
export const CreateTaskParamsSchema = z.object({
  title: z.string().min(1).max(500).describe('Заголовок задачи (обязательно)'),
  projectId: z.string().optional().describe('Project ID (defaults to Inbox)'),
  content: z.string().optional().describe('Описание/содержимое задачи'),
  priority: OptionalPrioritySchema,
  dueDate: z.string().optional().describe('Due date in ISO format (YYYY-MM-DD or full ISO)'),
  startDate: z.string().optional().describe('Start date in ISO format'),
  tags: z.array(z.string()).optional().describe('Теги для назначения'),
  items: z.array(ChecklistItemSchema).optional().describe('Подзадачи/элементы чеклиста'),
  fields: OptionalFieldsSchema,
});

/**
 * Type inference from schema
 */
export type CreateTaskParams = z.infer<typeof CreateTaskParamsSchema>;

/**
 * Shape of `data` in the success envelope (`{ success: true, data }`)
 */
export const CreateTaskOutputDataSchema = z.object({
  message: z.string(),
  task: TaskEntityOutputSchema,
  fieldsReturned: z.array(z.string()),
});

/**
 * outputSchema (JSON Schema 2020-12) — describes the whole success envelope,
 * not just `data` (see base-tool.ts SuccessEnvelope).
 */
export const CREATE_TASK_OUTPUT_SCHEMA = buildOutputSchema(CreateTaskOutputDataSchema);
