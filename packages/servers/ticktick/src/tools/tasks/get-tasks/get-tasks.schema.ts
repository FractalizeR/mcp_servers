/**
 * Zod schema for GetTasksTool parameters (batch)
 */

import { z } from 'zod';
import { TaskEntityOutputSchema, buildSuccessOutputSchema } from '#tools/shared/index.js';
import { FieldsSchema, TaskRefsSchema, TaskRefSchema } from '#common/schemas/index.js';

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

/**
 * Shape of `data` in the success envelope (`{ success: true, data }`)
 */
export const GetTasksOutputDataSchema = z.object({
  total: z.number(),
  successful: z.number(),
  failed: z.number(),
  tasks: z.array(
    z.object({
      taskId: TaskRefSchema,
      task: TaskEntityOutputSchema,
    })
  ),
  errors: z.array(
    z.object({
      taskId: TaskRefSchema,
      error: z.unknown(),
    })
  ),
  fieldsReturned: z.array(z.string()),
});

/**
 * outputSchema (JSON Schema 2020-12) — describes the whole success envelope,
 * not just `data` (see base-tool.ts SuccessEnvelope).
 */
export const GET_TASKS_OUTPUT_SCHEMA = buildSuccessOutputSchema(GetTasksOutputDataSchema);
