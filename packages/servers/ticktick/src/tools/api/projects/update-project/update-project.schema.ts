/**
 * Zod schema for UpdateProjectTool parameters validation
 */

import { z } from 'zod';
import { FieldsSchema } from '@fractalizer/mcp-core';

/**
 * Parameters schema for updating an existing project
 */
export const UpdateProjectParamsSchema = z.object({
  /**
   * Project ID
   */
  projectId: z.string().min(1, 'ID проекта обязателен').describe('ID проекта'),

  /**
   * New project name
   */
  name: z
    .string()
    .min(1)
    .max(100, 'Название проекта не может быть длиннее 100 символов')
    .optional()
    .describe('Новое название проекта'),

  /**
   * New project color
   */
  color: z.string().optional().describe('Новый цвет проекта'),

  /**
   * New view mode
   */
  viewMode: z.enum(['list', 'kanban', 'timeline']).optional().describe('Новый режим отображения'),

  /**
   * Close/open project
   */
  closed: z.boolean().optional().describe('Закрыть/открыть проект'),

  /**
   * Fields to return (optional for update operations)
   */
  fields: FieldsSchema.optional().describe('Поля для возврата'),
});

/**
 * Type inference from schema
 */
export type UpdateProjectParams = z.infer<typeof UpdateProjectParamsSchema>;
