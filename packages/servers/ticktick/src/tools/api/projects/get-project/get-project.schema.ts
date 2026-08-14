/**
 * Zod schema for GetProjectTool parameters validation
 */

import { z } from 'zod';
import { ProjectEntityOutputSchema } from '#tools/shared/index.js';
import { FieldsSchema, buildOutputSchema } from '@fractalizer/mcp-core';
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

/**
 * Shape of `data` in the success envelope (`{ success: true, data }`)
 */
export const GetProjectOutputDataSchema = z.object({
  project: ProjectEntityOutputSchema,
  fieldsReturned: z.array(z.string()),
});

/**
 * outputSchema (JSON Schema 2020-12) — describes the whole success envelope,
 * not just `data` (see base-tool.ts SuccessEnvelope).
 */
export const GET_PROJECT_OUTPUT_SCHEMA = buildOutputSchema(GetProjectOutputDataSchema);
