/**
 * Zod schema for CreateProjectTool parameters validation
 */

import { z } from 'zod';
import { ProjectEntityOutputSchema, buildSuccessOutputSchema } from '#tools/shared/index.js';
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

/**
 * Shape of `data` in the success envelope (`{ success: true, data }`)
 */
export const CreateProjectOutputDataSchema = z.object({
  message: z.string(),
  project: ProjectEntityOutputSchema,
  fieldsReturned: z.array(z.string()).optional(),
});

/**
 * outputSchema (JSON Schema 2020-12) — describes the whole success envelope,
 * not just `data` (see base-tool.ts SuccessEnvelope).
 */
export const CREATE_PROJECT_OUTPUT_SCHEMA = buildSuccessOutputSchema(CreateProjectOutputDataSchema);
