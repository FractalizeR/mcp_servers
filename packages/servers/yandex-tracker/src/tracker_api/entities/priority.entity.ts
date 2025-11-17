import type { WithUnknownFields } from './types.js';

/**
 * Приоритет задачи в Яндекс.Трекере
 *
 * ВАЖНО: Все поля обязательны - API всегда возвращает полную информацию о приоритете.
 */
export interface Priority {
  /** Идентификатор приоритета */
  readonly id: string;

  /** Ключ приоритета */
  readonly key: string;

  /** Название приоритета */
  readonly display: string;
}

/**
 * Приоритет с возможными unknown полями из API.
 * Используется при получении данных от API Трекера.
 */
export type PriorityWithUnknownFields = WithUnknownFields<Priority>;
