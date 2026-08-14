/**
 * DTO для создания сохранённого фильтра
 *
 * ВАЖНО: `filter` и `query` взаимоисключимы (см. `api-ref/filters/create-filter.md`).
 */

import type { FilterSortDto } from './filter-sort.dto.js';

export interface CreateFilterDto {
  /** Название фильтра (обязательно) */
  name: string;

  /** Условия фильтрации ключ-значение (взаимоисключимо с query) */
  filter?: Record<string, unknown> | undefined;

  /** Условия фильтрации в виде query-строки (взаимоисключимо с filter) */
  query?: string | undefined;

  /** Правила сортировки */
  sorts?: FilterSortDto[] | undefined;

  /** Поля для отображения в UI */
  fields?: string[] | undefined;

  /** Поле группировки */
  groupBy?: string | undefined;
}
