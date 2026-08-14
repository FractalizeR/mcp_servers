/**
 * Zod схема для валидации параметров GetQueueLocalFieldsTool
 */

import { z } from 'zod';
import {
  FieldsSchema,
  FilteredEntitySchema,
  FieldsReturnedSchema,
  buildOutputSchema,
} from '#common/schemas/index.js';

/**
 * ВАЖНО: эндпоинт не пагинируется (небольшой набор локальных полей очереди)
 * — аналогично get_components.
 */
export const GetQueueLocalFieldsParamsSchema = z.object({
  /** Идентификатор или ключ очереди (обязательно) */
  queueId: z.string().min(1, 'Queue ID не может быть пустым'),

  /** Список полей для возврата (обязательно) */
  fields: FieldsSchema,
});

export type GetQueueLocalFieldsParams = z.infer<typeof GetQueueLocalFieldsParamsSchema>;

export const GetQueueLocalFieldsOutputDataSchema = z.object({
  localFields: z.array(FilteredEntitySchema),
  count: z.number(),
  queueId: z.string(),
  fieldsReturned: FieldsReturnedSchema,
});

export const GetQueueLocalFieldsOutputSchema = buildOutputSchema(
  GetQueueLocalFieldsOutputDataSchema
);
