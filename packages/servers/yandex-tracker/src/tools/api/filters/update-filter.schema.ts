/**
 * Zod схема для валидации параметров UpdateFilterTool
 *
 * ВАЖНО: `filter` при передаче заменяет условия ЦЕЛИКОМ, не частично.
 * `filter`/`query` взаимоисключимы, но не проверяются `.refine()` — см.
 * примечание в `create-filter.schema.ts`.
 */

import { z } from 'zod';
import { FieldsSchema, FilteredEntitySchema, buildOutputSchema } from '#common/schemas/index.js';
import { FilterSortInputSchema } from './filter-sort.schema.js';

export const UpdateFilterParamsSchema = z.object({
  /** Идентификатор фильтра (обязательно) */
  filterId: z.string().min(1, 'Filter ID не может быть пустым'),

  /** Новое название фильтра (опционально) */
  name: z.string().min(1).optional(),

  /** Условия фильтрации — заменяют прежние ЦЕЛИКОМ (взаимоисключимо с query) */
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

export type UpdateFilterParams = z.infer<typeof UpdateFilterParamsSchema>;

export const UpdateFilterOutputDataSchema = z.object({
  filter: FilteredEntitySchema,
});

export const UpdateFilterOutputSchema = buildOutputSchema(UpdateFilterOutputDataSchema);
