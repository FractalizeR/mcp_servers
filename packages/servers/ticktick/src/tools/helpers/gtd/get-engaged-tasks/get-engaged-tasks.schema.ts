/**
 * Schema for GetEngagedTasks tool
 */

import { z } from 'zod';
import { FieldsSchema, TaskEntityOutputSchema } from '#tools/shared/index.js';
import {
  buildCollectionOutputSchema,
  collectionResponseModeParamSchema,
} from '@fractalizer/mcp-core';
export const GetEngagedTasksParamsSchema = z.object({
  fields: FieldsSchema.describe('Поля для возврата'),
  responseMode: collectionResponseModeParamSchema({ itemsNoun: 'задач' }),
});

export type GetEngagedTasksParams = z.infer<typeof GetEngagedTasksParamsSchema>;

/**
 * Сводка коллекции (пакет 5.1.C.ticktick).
 */
export const GetEngagedTasksSummarySchema = z.object({
  description: z.string(),
  highPriorityCount: z.number(),
  overdueCount: z.number(),
  fieldsReturned: z.union([z.array(z.string()), z.literal('all')]),
});

/**
 * outputSchema (JSON Schema 2020-12) — describes the whole success envelope,
 * not just `data` (see base-tool.ts SuccessEnvelope).
 */
export const GET_ENGAGED_TASKS_OUTPUT_SCHEMA = buildCollectionOutputSchema(
  TaskEntityOutputSchema,
  GetEngagedTasksSummarySchema
);
