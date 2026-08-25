/**
 * Zod схема для валидации параметров CreateComponentTool
 *
 * `POST /v3/components` принимает очередь только КЛЮЧОМ в теле (`queue`), не ID
 * (D1, `0_CONTRACTS.md`) — числовой id пройдёт валидацию Zod, но будет отклонён
 * рубежом живых прогонов и/или API.
 */

import { z } from 'zod';
import { FieldsSchema, FilteredEntitySchema, buildOutputSchema } from '#common/schemas/index.js';

/**
 * Схема параметров для создания компонента
 */
export const CreateComponentParamsSchema = z.object({
  /**
   * Ключ очереди (не ID) — уходит в тело как `queue`
   */
  queueId: z
    .string()
    .min(1, 'Queue ID обязателен')
    .describe('Ключ очереди (не ID) — справочник get_queues, поле key'),

  /**
   * Название компонента
   */
  name: z.string().min(1, 'Название компонента обязательно'),

  /**
   * Описание компонента (опционально)
   */
  description: z.string().optional(),

  /**
   * ID или login руководителя компонента (опционально)
   */
  lead: z.string().optional(),

  /**
   * Автоматическое назначение задач (опционально)
   */
  assignAuto: z.boolean().optional(),

  /**
   * Массив полей для возврата в результате (обязательный)
   * Примеры: ['id', 'name'], ['id', 'name', 'description', 'lead.display']
   */
  fields: FieldsSchema,
});

/**
 * Вывод типа из схемы
 */
export type CreateComponentParams = z.infer<typeof CreateComponentParamsSchema>;

/**
 * Схема данных успешного результата (поле `data` envelope `formatSuccess()`)
 */
export const CreateComponentOutputDataSchema = z.object({
  component: FilteredEntitySchema,
  message: z.string(),
});

/**
 * outputSchema инструмента (JSON Schema 2020-12, envelope `{ success, data }`)
 */
export const CreateComponentOutputSchema = buildOutputSchema(CreateComponentOutputDataSchema);
