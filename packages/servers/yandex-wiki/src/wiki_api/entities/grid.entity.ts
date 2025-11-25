import type { WithUnknownFields } from './types.js';

/**
 * Тип колонки
 */
export type ColumnType =
  | 'string'
  | 'number'
  | 'date'
  | 'select'
  | 'staff'
  | 'checkbox'
  | 'ticket'
  | 'ticket_field';

/**
 * Формат текста
 */
export type TextFormat = 'yfm' | 'wom' | 'plain';

/**
 * Цвет фона
 */
export type BGColor =
  | 'blue'
  | 'yellow'
  | 'pink'
  | 'red'
  | 'green'
  | 'mint'
  | 'grey'
  | 'orange'
  | 'magenta'
  | 'purple'
  | 'copper'
  | 'ocean';

/**
 * Колонка таблицы (response)
 */
export interface GridColumn {
  readonly id?: string;
  readonly title: string;
  readonly slug: string;
  readonly type: ColumnType;
  readonly required: boolean;
  readonly color?: BGColor;
  readonly width?: number;
  readonly width_units?: '%' | 'px';
  readonly pinned?: 'left' | 'right';
  readonly format?: TextFormat;
  readonly multiple?: boolean;
  readonly select_options?: string[];
  readonly description?: string;
}

/**
 * Колонка таблицы для ввода (request) - поддерживает undefined для zod schemas
 */
export interface InputGridColumn {
  readonly title: string;
  readonly slug: string;
  readonly type: ColumnType;
  readonly required: boolean;
  readonly color?: BGColor | undefined;
  readonly width?: number | undefined;
  readonly width_units?: '%' | 'px' | undefined;
  readonly pinned?: 'left' | 'right' | undefined;
  readonly format?: TextFormat | undefined;
  readonly multiple?: boolean | undefined;
  readonly select_options?: string[] | undefined;
  readonly description?: string | undefined;
}

/**
 * Строка таблицы
 */
export interface GridRow {
  readonly id: string;
  readonly row: unknown[];
  readonly pinned?: boolean;
  readonly color?: BGColor;
}

/**
 * Сортировка
 */
export interface SortConfig {
  readonly column_slug: string;
  readonly direction: 'asc' | 'desc';
}

/**
 * Структура таблицы
 */
export interface GridStructure {
  readonly columns: GridColumn[];
  readonly default_sort?: SortConfig[];
}

/**
 * Атрибуты таблицы
 */
export interface GridAttributes {
  readonly created_at: string;
  readonly modified_at: string;
}

/**
 * Динамическая таблица
 */
export interface Grid {
  readonly created_at: string;
  readonly title: string;
  readonly page: {
    readonly id: number;
    readonly slug: string;
  };
  readonly revision: string;
  readonly rich_text_format: TextFormat;
  readonly structure: GridStructure;
  readonly rows: GridRow[];
  readonly attributes?: GridAttributes;
  readonly user_permissions?: unknown;
  readonly template_id?: string;
}

export type GridWithUnknownFields = WithUnknownFields<Grid>;
