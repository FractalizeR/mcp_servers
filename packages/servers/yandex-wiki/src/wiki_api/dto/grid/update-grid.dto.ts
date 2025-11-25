import type { SortConfig } from '#wiki_api/entities/index.js';

/**
 * DTO для обновления таблицы
 */
export interface UpdateGridDto {
  /** Текущая ревизия (обязательно) */
  revision: string;

  /** Новое название (1-255 символов) */
  title?: string;

  /** Сортировка по умолчанию */
  default_sort?: SortConfig[];
}
