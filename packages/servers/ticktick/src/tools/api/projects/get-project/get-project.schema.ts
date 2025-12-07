/**
 * Zod schema for GetProjectTool parameters validation
 */

import { z } from 'zod';
import { FieldsSchema } from '@mcp-framework/core';

/**
 * Parameters schema for getting a single project by ID
 */
export const GetProjectParamsSchema = z.object({
  /**
   * Project ID
   */
  projectId: z.string().min(1, 'ID проекта обязателен').describe('ID проекта'),

  /**
   * Fields to return (required for context economy)
   */
  fields: FieldsSchema,
});

/**
 * Type inference from schema
 */
export type GetProjectParams = z.infer<typeof GetProjectParamsSchema>;
