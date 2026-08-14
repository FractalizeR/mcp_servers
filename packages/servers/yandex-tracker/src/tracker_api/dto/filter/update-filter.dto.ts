/**
 * DTO для обновления сохранённого фильтра
 *
 * ВАЖНО: `filter` при передаче заменяет условия ЦЕЛИКОМ, не частично
 * (см. `api-ref/filters/update-filter.md`, дословно: "the filter parameter
 * is replaced entirely, not partially updated").
 */

import type { FilterSortDto } from './filter-sort.dto.js';

export interface UpdateFilterDto {
  /** Идентификатор фильтра */
  filterId: string;

  /** Новое название фильтра */
  name?: string | undefined;

  /** Условия фильтрации — заменяют прежние целиком (взаимоисключимо с query) */
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
