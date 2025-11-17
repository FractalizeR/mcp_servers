import type { WithUnknownFields } from './types.js';

/**
 * Очередь задач в Яндекс.Трекере
 *
 * ВАЖНО: Все поля обязательны - API всегда возвращает полную информацию о очереди.
 */
export interface Queue {
  /** Идентификатор очереди */
  readonly id: string;

  /** Ключ очереди */
  readonly key: string;

  /** Название очереди */
  readonly name: string;
}

/**
 * Очередь с возможными unknown полями из API.
 * Используется при получении данных от API Трекера.
 */
export type QueueWithUnknownFields = WithUnknownFields<Queue>;
