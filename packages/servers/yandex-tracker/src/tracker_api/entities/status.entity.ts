import type { WithUnknownFields } from './types.js';

/**
 * Статус задачи в Яндекс.Трекере
 *
 * ВАЖНО: Все поля обязательны - API всегда возвращает полную информацию о статусе.
 */
export interface Status {
  /** Идентификатор статуса */
  readonly id: string;

  /** Ключ статуса */
  readonly key: string;

  /** Название статуса */
  readonly display: string;
}

/**
 * Статус с возможными unknown полями из API.
 * Используется при получении данных от API Трекера.
 */
export type StatusWithUnknownFields = WithUnknownFields<Status>;
