/**
 * Zod schema for GetProjectsTool parameters validation
 */

import { z } from 'zod';
import { FieldsSchema } from '@mcp-framework/core';

/**
 * Parameters schema for getting all projects
 */
export const GetProjectsParamsSchema = z.object({
  /**
   * Fields to return (required for context economy)
   */
  fields: FieldsSchema,
});

/**
 * Type inference from schema
 */
export type GetProjectsParams = z.infer<typeof GetProjectsParamsSchema>;
