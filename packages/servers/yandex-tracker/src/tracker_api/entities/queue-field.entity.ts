/**
 * Доменный тип: Поле очереди в Яндекс.Трекере
 *
 * Соответствует API v3: /v3/queues/{queueId}/fields
 */

import type { WithUnknownFields } from './types.js';

/**
 * Категория поля
 */
export interface QueueFieldCategory {
  /** Идентификатор категории */
  readonly id: string;

  /** Отображаемое имя категории */
  readonly display: string;
}

/**
 * Поле очереди задач в Яндекс.Трекере
 *
 * ВАЖНО: Типизация основана на реальных ответах API v3.
 * Обязательные поля (без ?) всегда присутствуют в ответе.
 */
export interface QueueField {
  /** Идентификатор поля (всегда присутствует) */
  readonly id: string;

  /** Ключ поля (всегда присутствует) */
  readonly key: string;

  /** Название поля (всегда присутствует) */
  readonly name: string;

  /** Является ли поле обязательным (всегда присутствует) */
  readonly required: boolean;

  /**
   * Тип поля (всегда присутствует)
   * Примеры: 'string', 'user', 'date', 'number', 'select', 'array'
   */
  readonly type: string;

  /** Категория поля (может отсутствовать) */
  readonly category?: QueueFieldCategory;
}

/**
 * Поле очереди с возможными unknown полями из API.
 * Используется при получении данных от API Трекера.
 */
export type QueueFieldWithUnknownFields = WithUnknownFields<QueueField>;
