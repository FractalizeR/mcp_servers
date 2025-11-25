import type { BGColor } from '#wiki_api/entities/index.js';

/**
 * DTO для добавления строк
 */
export interface AddRowsDto {
  /** Ревизия таблицы */
  revision?: string;

  /** Позиция вставки */
  position?: number;

  /** Вставить после строки */
  after_row_id?: string;

  /** Данные строк (обязательно) */
  rows: Array<{
    row: unknown[];
    pinned?: boolean | undefined;
    color?: BGColor | undefined;
  }>;
}

/**
 * DTO для удаления строк
 */
export interface RemoveRowsDto {
  /** Ревизия таблицы */
  revision?: string;

  /** ID строк для удаления (обязательно) */
  row_ids: string[];
}

/**
 * DTO для перемещения строки
 */
export interface MoveRowDto {
  /** ID строки (обязательно) */
  row_id: string;

  /** Переместить после строки */
  after_row_id?: string;

  /** Позиция */
  position?: number;

  /** Ревизия */
  revision?: string;

  /** Количество строк */
  rows_count?: number;
}
