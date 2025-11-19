/**
 * Доменный тип: Доска (Board) в Яндекс.Трекере
 *
 * Соответствует API v2: /v2/boards/{boardId}
 */

import type { WithUnknownFields } from './types.js';

/**
 * Колонка доски (упрощенная версия для вложенного объекта)
 */
export interface BoardColumn {
  /** Идентификатор колонки */
  readonly id: string;

  /** Название колонки */
  readonly name: string;

  /** Статусы, относящиеся к этой колонке */
  readonly statuses?: ReadonlyArray<{
    readonly id: string;
    readonly key: string;
    readonly display: string;
  }>;
}

/**
 * Фильтр доски (определяет какие задачи показываются на доске)
 */
export interface BoardFilter {
  /** Идентификатор фильтра */
  readonly id?: string;

  /** Название фильтра */
  readonly name?: string;

  /** Условия фильтра в виде query string */
  readonly query?: string;
}

/**
 * Референс на страну (для региональных настроек)
 */
export interface CountryRef {
  /** Идентификатор страны */
  readonly id: string;

  /** URL ссылка на страну в API */
  readonly self: string;

  /** Отображаемое название страны */
  readonly display: string;
}

/**
 * Доска в Яндекс.Трекере
 *
 * ВАЖНО: Типизация основана на официальном Python SDK и реальных ответах API v2.
 * Обязательные поля (без ?) всегда присутствуют в ответе GET /v2/boards/{boardId}.
 * Опциональные поля могут отсутствовать в зависимости от настроек доски.
 */
export interface Board {
  /** Идентификатор доски (всегда присутствует) */
  readonly id: string;

  /** URL ссылка на доску в API (всегда присутствует) */
  readonly self: string;

  /** Версия доски (для оптимистичных блокировок) (всегда присутствует) */
  readonly version: number;

  /** Название доски (всегда присутствует) */
  readonly name: string;

  /** Колонки доски (может отсутствовать или быть пустым массивом) */
  readonly columns?: ReadonlyArray<BoardColumn>;

  /** Фильтр доски (может отсутствовать) */
  readonly filter?: BoardFilter;

  /** Поле для сортировки задач на доске (может отсутствовать) */
  readonly orderBy?: string;

  /** Порядок сортировки: true = по возрастанию, false = по убыванию (может отсутствовать) */
  readonly orderAsc?: boolean;

  /** Query string для фильтрации задач (может отсутствовать) */
  readonly query?: string;

  /** Выбранные параметры отображения (может отсутствовать) */
  readonly selected?: unknown;

  /** Использовать ранжирование задач (может отсутствовать) */
  readonly useRanking?: boolean;

  /** Страна для региональных настроек (может отсутствовать) */
  readonly country?: CountryRef;
}

/**
 * Доска с возможными unknown полями из API.
 * Используется при получении данных от API Трекера.
 */
export type BoardWithUnknownFields = WithUnknownFields<Board>;
