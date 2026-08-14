import type { WithUnknownFields } from './types.js';

/**
 * Резолюция задачи в Яндекс.Трекере
 *
 * Соответствует API v3: /v3/resolutions
 *
 * ВАЖНО: Все поля обязательны - API всегда возвращает полную информацию о резолюции.
 */
export interface Resolution {
  /** Идентификатор резолюции */
  readonly id: string;

  /** Ключ резолюции */
  readonly key: string;

  /** Название резолюции */
  readonly display: string;
}

/**
 * Резолюция с возможными unknown полями из API.
 * Используется при получении данных от API Трекера.
 */
export type ResolutionWithUnknownFields = WithUnknownFields<Resolution>;
