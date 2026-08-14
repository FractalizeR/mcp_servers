/**
 * Zod schema for GetAllTasksTool parameters
 */

import { z } from 'zod';
import { TaskEntityOutputSchema } from '#tools/shared/index.js';
import { FieldsSchema, StatusFilterSchema } from '#common/schemas/index.js';
import {
  buildCollectionOutputSchema,
  collectionResponseModeParamSchema,
} from '@fractalizer/mcp-core';

/**
 * Parameters schema for getting all tasks
 */
export const GetAllTasksParamsSchema = z.object({
  fields: FieldsSchema,
  status: StatusFilterSchema,
  responseMode: collectionResponseModeParamSchema({ itemsNoun: 'задач' }),
});

/**
 * Type inference from schema
 */
export type GetAllTasksParams = z.infer<typeof GetAllTasksParamsSchema>;

/**
 * Сводка коллекции (пакет 5.1.C.ticktick) — присутствует в обоих режимах
 * (`links`/`full`), в отличие от `items`/`resourceLinks`.
 */
export const GetAllTasksSummarySchema = z.object({
  status: z.enum(['all', 'uncompleted', 'completed']),
  fieldsReturned: z.array(z.string()),
});

/**
 * outputSchema (JSON Schema 2020-12) — describes the whole success envelope,
 * not just `data` (see base-tool.ts SuccessEnvelope). Форма `data` —
 * `{ mode, totalCount, threshold, summary, items?, resourceLinks? }`, см.
 * `buildCollectionOutputSchema` (пакет 5.1.B).
 */
export const GET_ALL_TASKS_OUTPUT_SCHEMA = buildCollectionOutputSchema(
  TaskEntityOutputSchema,
  GetAllTasksSummarySchema
);
