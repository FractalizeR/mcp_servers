/**
 * DTO для обновления доски в Яндекс.Трекере
 */

import type { CreateBoardColumnDto } from './create-board.dto.js';

/**
 * Фильтр доски — карта «поле задачи → значение или список значений».
 *
 * Форма снята чтением боевых досок 2026-08-25 (`{"queue": ["DVIZHDEV"]}`); прежняя
 * `{query}` отвергалась API с 422.
 */
export type UpdateBoardFilterDto = Record<string, string | number | Array<string | number>>;

export interface UpdateBoardDto {
  /** ID доски для обновления */
  boardId: string;

  /** Новое название доски */
  name?: string | undefined;

  /** Версия доски (для оптимистичной блокировки) */
  version?: number | undefined;

  /** Обновленные колонки доски */
  columns?: CreateBoardColumnDto[] | undefined;

  /** Обновленный фильтр доски */
  filter?: UpdateBoardFilterDto | undefined;

  /** Поле для сортировки задач */
  orderBy?: string | undefined;

  /** Порядок сортировки: true = возрастание, false = убывание */
  orderAsc?: boolean | undefined;

  /** Query string для дополнительной фильтрации */
  query?: string | undefined;

  /** Использовать ранжирование задач */
  useRanking?: boolean | undefined;

  /** ID страны для региональных настроек */
  country?: string | undefined;

  /** Дополнительные поля */
  [key: string]: unknown;
}
