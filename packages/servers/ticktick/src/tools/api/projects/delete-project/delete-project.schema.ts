/**
 * Zod schema for DeleteProjectTool parameters validation
 */

import { z } from 'zod';

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
