/**
 * DTO для обновления доски в Яндекс.Трекере
 */

import type { CreateBoardColumnDto, CreateBoardFilterDto } from './create-board.dto.js';

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
  filter?: CreateBoardFilterDto | undefined;

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
