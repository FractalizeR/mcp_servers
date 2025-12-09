/**
 * Zod schema for CreateProjectTool parameters validation
 */

import { z } from 'zod';
import { FieldsSchema } from '@fractalizer/mcp-core';

/**
 * Parameters schema for creating a new project
 */
export const CreateProjectParamsSchema = z.object({
  /**
   * Project name
   */
  name: z
    .string()
    .min(1, 'Название проекта обязательно')
    .max(100, 'Название проекта не может быть длиннее 100 символов')
    .describe('Название проекта'),

  /**
   * Project color (hex format)
   */
  color: z.string().optional().describe('Цвет проекта (hex формат)'),

  /**
   * View mode
   */
  viewMode: z
    .enum(['list', 'kanban', 'timeline'])
    .optional()
    .describe('Режим отображения (list, kanban, timeline)'),

  /**
   * Project kind
   */
  kind: z.enum(['TASK', 'NOTE']).optional().describe('Тип проекта (TASK или NOTE)'),

  /**
   * Fields to return (optional for create operations)
   */
  fields: FieldsSchema.optional().describe('Поля для возврата'),
});

/**
 * Type inference from schema
 */
export type CreateProjectParams = z.infer<typeof CreateProjectParamsSchema>;
