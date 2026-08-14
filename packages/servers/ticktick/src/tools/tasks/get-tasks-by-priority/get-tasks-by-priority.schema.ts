/**
 * Zod schema for GetTasksByPriorityTool parameters
 */

import { z } from 'zod';
import { TaskEntityOutputSchema } from '#tools/shared/index.js';
import { FieldsSchema, PrioritySchema } from '#common/schemas/index.js';
import {
  buildCollectionOutputSchema,
  collectionResponseModeParamSchema,
} from '@fractalizer/mcp-core';

/**
 * Parameters schema for getting tasks by priority
 */
export const GetTasksByPriorityParamsSchema = z.object({
  priority: PrioritySchema,
  fields: FieldsSchema,
  responseMode: collectionResponseModeParamSchema({ itemsNoun: 'задач' }),
});

/**
 * Type inference from schema
 */
export type GetTasksByPriorityParams = z.infer<typeof GetTasksByPriorityParamsSchema>;

/**
 * Сводка коллекции (пакет 5.1.C.ticktick).
 */
export const GetTasksByPrioritySummarySchema = z.object({
  priority: z.number(),
  priorityLabel: z.string(),
  fieldsReturned: z.array(z.string()),
});

/**
 * outputSchema (JSON Schema 2020-12) — describes the whole success envelope,
 * not just `data` (see base-tool.ts SuccessEnvelope).
 */
export const GET_TASKS_BY_PRIORITY_OUTPUT_SCHEMA = buildCollectionOutputSchema(
  TaskEntityOutputSchema,
  GetTasksByPrioritySummarySchema
);
