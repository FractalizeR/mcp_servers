/**
 * DTO для создания доски в Яндекс.Трекере
 */

/**
 * Колонка доски при создании
 */
export interface CreateBoardColumnDto {
  /** Название колонки */
  name: string;

  /** Массив ключей статусов для этой колонки */
  statuses: string[];
}

/**
 * Фильтр доски при создании
 */
export interface CreateBoardFilterDto {
  /** Query string для фильтрации задач на доске */
  query?: string | undefined;
}

export interface CreateBoardDto {
  /** Название доски */
  name: string;

  /** ID очереди, для которой создается доска */
  queue?: string | undefined;

  /** Колонки доски */
  columns?: CreateBoardColumnDto[] | undefined;

  /** Фильтр доски */
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
