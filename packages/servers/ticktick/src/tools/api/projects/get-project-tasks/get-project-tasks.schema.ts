/**
 * Zod schema for GetProjectTasksTool parameters validation
 */

import { z } from 'zod';
import { TaskEntityOutputSchema, buildSuccessOutputSchema } from '#tools/shared/index.js';
import { FieldsSchema } from '@fractalizer/mcp-core';

/**
 * Parameters schema for getting all tasks of a project
 */
export const GetProjectTasksParamsSchema = z.object({
  /**
   * Project ID
   */
  projectId: z.string().min(1, 'ID проекта обязателен').describe('ID проекта'),

  /**
   * Fields to return for tasks (required for context economy)
   */
  fields: FieldsSchema.describe('Поля задач для возврата'),
});

/**
 * Type inference from schema
 */
export type GetProjectTasksParams = z.infer<typeof GetProjectTasksParamsSchema>;

/**
 * Shape of `data` in the success envelope (`{ success: true, data }`)
 */
export const GetProjectTasksOutputDataSchema = z.object({
  projectId: z.string(),
  projectName: z.string(),
  total: z.number(),
  tasks: z.array(TaskEntityOutputSchema),
  fieldsReturned: z.array(z.string()),
});

/**
 * outputSchema (JSON Schema 2020-12) — describes the whole success envelope,
 * not just `data` (see base-tool.ts SuccessEnvelope).
 */
export const GET_PROJECT_TASKS_OUTPUT_SCHEMA = buildSuccessOutputSchema(
  GetProjectTasksOutputDataSchema
);
