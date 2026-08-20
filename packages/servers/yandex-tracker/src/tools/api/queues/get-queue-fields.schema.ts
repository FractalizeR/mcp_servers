/**
 * Zod схема для валидации параметров GetQueueFieldsTool
 */

import { z } from 'zod';
import { FieldsSchema, FilteredEntitySchema, buildOutputSchema } from '#common/schemas/index.js';

/**
 * Схема параметров для получения полей очереди
 */
export const GetQueueFieldsParamsSchema = z.object({
  /**
   * Идентификатор или ключ очереди (обязательно)
   */
  queueId: z.string().min(1, 'Queue ID не может быть пустым'),

  /**
   * Список полей для возврата (обязательно)
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type GetQueueFieldsParams = z.infer<typeof GetQueueFieldsParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const GetQueueFieldsOutputDataSchema = z.object({
  fields: z.array(FilteredEntitySchema),
  count: z.number(),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const GetQueueFieldsOutputSchema = buildOutputSchema(GetQueueFieldsOutputDataSchema);
