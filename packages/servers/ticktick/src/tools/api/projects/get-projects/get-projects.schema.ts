/**
 * Zod schema for GetProjectsTool parameters validation
 */

import { z } from 'zod';
import { ProjectEntityOutputSchema } from '#tools/shared/index.js';
import {
  FieldsSchema,
  buildCollectionOutputSchema,
  collectionResponseModeParamSchema,
} from '@fractalizer/mcp-core';
/**
 * Parameters schema for getting all projects
 */
export const GetProjectsParamsSchema = z.object({
  /**
   * Fields to return (required for context economy)
   */
  fields: FieldsSchema,

  responseMode: collectionResponseModeParamSchema({ itemsNoun: 'проектов' }),
});

/**
 * Type inference from schema
 */
export type GetProjectsParams = z.infer<typeof GetProjectsParamsSchema>;

/**
 * Сводка коллекции (пакет 5.1.C.ticktick).
 */
export const GetProjectsSummarySchema = z.object({
  fieldsReturned: z.array(z.string()),
});

/**
 * outputSchema (JSON Schema 2020-12) — describes the whole success envelope,
 * not just `data` (see base-tool.ts SuccessEnvelope).
 */
export const GET_PROJECTS_OUTPUT_SCHEMA = buildCollectionOutputSchema(
  ProjectEntityOutputSchema,
  GetProjectsSummarySchema
);
