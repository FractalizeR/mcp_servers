/**
 * Schema for GetTasksDueThisWeek tool
 */

import { z } from 'zod';
import { FieldsSchema, TaskEntityOutputSchema } from '#tools/shared/index.js';
import {
  buildCollectionOutputSchema,
  collectionResponseModeParamSchema,
} from '@fractalizer/mcp-core';
export const GetTasksDueThisWeekParamsSchema = z.object({
  fields: FieldsSchema.describe('Поля для возврата'),
  responseMode: collectionResponseModeParamSchema({ itemsNoun: 'задач' }),
});

export type GetTasksDueThisWeekParams = z.infer<typeof GetTasksDueThisWeekParamsSchema>;

/**
 * Сводка коллекции (пакет 5.1.C.ticktick).
 */
export const GetTasksDueThisWeekSummarySchema = z.object({
  weekStart: z.string(),
  weekEnd: z.string(),
  fieldsReturned: z.union([z.array(z.string()), z.literal('all')]),
});

/**
 * outputSchema (JSON Schema 2020-12) — describes the whole success envelope,
 * not just `data` (see base-tool.ts SuccessEnvelope).
 */
export const GET_TASKS_DUE_THIS_WEEK_OUTPUT_SCHEMA = buildCollectionOutputSchema(
  TaskEntityOutputSchema,
  GetTasksDueThisWeekSummarySchema
);
