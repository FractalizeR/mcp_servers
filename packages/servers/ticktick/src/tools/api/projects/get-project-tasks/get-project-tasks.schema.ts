/**
 * Zod schema for GetProjectTasksTool parameters validation
 */

import { z } from 'zod';
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
