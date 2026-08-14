/**
 * Zod schema for DeleteProjectTool parameters validation
 */

import { z } from 'zod';
import { buildSuccessOutputSchema } from '#tools/shared/index.js';

/**
 * Parameters schema for deleting a project
 */
export const DeleteProjectParamsSchema = z.object({
  /**
   * Project ID to delete
   */
  projectId: z.string().min(1, 'ID проекта обязателен').describe('ID проекта для удаления'),
});

/**
 * Type inference from schema
 */
export type DeleteProjectParams = z.infer<typeof DeleteProjectParamsSchema>;

/**
 * Shape of `data` in the success envelope (`{ success: true, data }`)
 */
export const DeleteProjectOutputDataSchema = z.object({
  message: z.string(),
  deletedProjectId: z.string(),
});

/**
 * outputSchema (JSON Schema 2020-12) — describes the whole success envelope,
 * not just `data` (see base-tool.ts SuccessEnvelope).
 */
export const DELETE_PROJECT_OUTPUT_SCHEMA = buildSuccessOutputSchema(DeleteProjectOutputDataSchema);
