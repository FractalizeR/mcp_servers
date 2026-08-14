/**
 * Zod схема для валидации параметров GetComponentsTool
 */

import { z } from 'zod';
import {
  FieldsSchema,
  FilteredEntitySchema,
  FieldsReturnedSchema,
  buildOutputSchema,
} from '#common/schemas/index.js';

/**
 * Схема параметров для получения списка компонентов очереди.
 *
 * ВАЖНО: эндпоинт компонентов НЕ пагинируется (API не присылает Link) — все
 * компоненты возвращаются одним ответом. Поэтому пагинационных параметров
 * (page/perPage/fetchAll/maxItems) и курсора у этого инструмента нет.
 */
export const GetComponentsParamsSchema = z.object({
  /**
   * ID или ключ очереди
   */
  queueId: z.string().min(1, 'Queue ID обязателен'),

  /**
   * Массив полей для возврата в результате (обязательный)
   * Примеры: ['id', 'name'], ['id', 'name', 'description', 'lead.login']
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type GetComponentsParams = z.infer<typeof GetComponentsParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const GetComponentsOutputDataSchema = z.object({
  components: z.array(FilteredEntitySchema),
  count: z.number(),
  queueId: z.string(),
  fieldsReturned: FieldsReturnedSchema,
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const GetComponentsOutputSchema = buildOutputSchema(GetComponentsOutputDataSchema);
