/**
 * Zod схема для валидации параметров GetGlobalFieldsTool
 */

import { z } from 'zod';
import { FieldsSchema, FilteredEntitySchema, buildOutputSchema } from '#common/schemas/index.js';

/**
 * ВАЖНО: эндпоинт `GET /v2/fields` не пагинируется — возвращает разом все
 * поля трекера (системные + кастомные), аналогично get_statuses/get_priorities.
 */
export const GetGlobalFieldsParamsSchema = z.object({
  /** Список полей для возврата (обязательно) */
  fields: FieldsSchema,
});

export type GetGlobalFieldsParams = z.infer<typeof GetGlobalFieldsParamsSchema>;

export const GetGlobalFieldsOutputDataSchema = z.object({
  globalFields: z.array(FilteredEntitySchema),
  count: z.number(),
});

export const GetGlobalFieldsOutputSchema = buildOutputSchema(GetGlobalFieldsOutputDataSchema);
