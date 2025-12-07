/**
 * Zod schema for CreateTaskTool parameters
 */

import { z } from 'zod';
import { OptionalFieldsSchema, OptionalPrioritySchema } from '#common/schemas/index.js';

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
  title: z.string().min(1).max(500).describe('Task title (required)'),
  projectId: z.string().optional().describe('Project ID (defaults to Inbox)'),
  content: z.string().optional().describe('Task description/content'),
  priority: OptionalPrioritySchema,
  dueDate: z.string().optional().describe('Due date in ISO format (YYYY-MM-DD or full ISO)'),
  startDate: z.string().optional().describe('Start date in ISO format'),
  tags: z.array(z.string()).optional().describe('Tags to assign'),
  items: z.array(ChecklistItemSchema).optional().describe('Subtasks/checklist items'),
  fields: OptionalFieldsSchema,
});

/**
 * Type inference from schema
 */
export type CreateTaskParams = z.infer<typeof CreateTaskParamsSchema>;
