/**
 * Zod схема для валидации параметров CreateFilterTool
 */

import { z } from 'zod';
import { FieldsSchema, FilteredEntitySchema, buildOutputSchema } from '#common/schemas/index.js';
import { FilterSortInputSchema } from './filter-sort.schema.js';

/**
 * ВАЖНО: `filter` и `query` взаимоисключимы (см. `api-ref/filters/create-filter.md`).
 * Не проверяется схемой (`.refine()`): смок-тест достижимости параметров
 * (`tests/smoke/tool-params-reach-api.smoke.test.ts`) заполняет ВСЕ поля
 * write-инструмента одновременно ради проверки, что каждое поле доезжает до
 * HTTP — межпольный `.refine()` отклонил бы такой образец ещё на
 * `validateParams()`, до HTTP-запроса, дав ложное "недостижимо". Тот же
 * компромисс уже сделан для пагинации (`noCursorWithBulkParams` применяется
 * только к read-инструментам, исключённым из этой проверки). Взаимную
 * исключительность здесь проверяет сам API Трекера (400 при обоих полях).
 */
export const CreateFilterParamsSchema = z.object({
  /** Название фильтра (обязательно) */
  name: z.string().min(1, 'Название фильтра обязательно'),

  /** Условия фильтрации ключ-значение (взаимоисключимо с query — см. примечание выше) */
  filter: z.record(z.string(), z.unknown()).optional(),

  /** Условия фильтрации в виде query-строки (взаимоисключимо с filter) */
  query: z.string().optional(),

  /** Правила сортировки (опционально) */
  sorts: z.array(FilterSortInputSchema).optional(),

  /** Поля для отображения в UI (опционально) */
  displayFields: z.array(z.string()).optional(),

  /** Поле группировки (опционально) */
  groupBy: z.string().optional(),

  /** Список полей для возврата результата (обязательно) */
  fields: FieldsSchema,
});

export type CreateFilterParams = z.infer<typeof CreateFilterParamsSchema>;

export const CreateFilterOutputDataSchema = z.object({
  filter: FilteredEntitySchema,
  message: z.string(),
});

export const CreateFilterOutputSchema = buildOutputSchema(CreateFilterOutputDataSchema);
