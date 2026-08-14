/**
 * Zod schema for GetProjectsTool parameters validation
 */

import { z } from 'zod';
import { ProjectEntityOutputSchema } from '#tools/shared/index.js';
import { FieldsSchema, buildOutputSchema } from '@fractalizer/mcp-core';
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

/**
 * Shape of `data` in the success envelope (`{ success: true, data }`)
 */
export const GetProjectsOutputDataSchema = z.object({
  total: z.number(),
  projects: z.array(ProjectEntityOutputSchema),
  fieldsReturned: z.array(z.string()),
});

/**
 * outputSchema (JSON Schema 2020-12) — describes the whole success envelope,
 * not just `data` (see base-tool.ts SuccessEnvelope).
 */
export const GET_PROJECTS_OUTPUT_SCHEMA = buildOutputSchema(GetProjectsOutputDataSchema);
