import type { GridColumn } from '#wiki_api/entities/index.js';

/**
 * DTO для добавления колонок
 */
export interface AddColumnsDto {
  /** Ревизия */
  revision?: string;

  /** Позиция вставки */
  position?: number;

  /** Колонки (обязательно) */
  columns: Omit<GridColumn, 'id'>[];
}

/**
 * DTO для удаления колонок
 */
export interface RemoveColumnsDto {
  /** Ревизия */
  revision?: string;

  /** Slugs колонок для удаления (обязательно) */
  column_slugs: string[];
}

/**
 * DTO для перемещения колонки
 */
export interface MoveColumnDto {
  /** Slug колонки (обязательно) */
  column_slug: string;

  /** Целевая позиция (обязательно) */
  position: number;

  /** Ревизия */
  revision?: string;

  /** Количество колонок */
  columns_count?: number;
}
