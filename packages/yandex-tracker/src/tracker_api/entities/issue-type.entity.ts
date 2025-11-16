import type { WithUnknownFields } from './types.js';

/**
 * Тип задачи в Яндекс.Трекере
 *
 * ВАЖНО: Все поля обязательны - API всегда возвращает полную информацию о типе.
 */
export interface IssueType {
  /** Идентификатор типа */
  readonly id: string;

  /** Ключ типа */
  readonly key: string;

  /** Название типа */
  readonly display: string;
}

/**
 * Тип задачи с возможными unknown полями из API.
 * Используется при получении данных от API Трекера.
 */
export type IssueTypeWithUnknownFields = WithUnknownFields<IssueType>;
