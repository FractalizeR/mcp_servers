/**
 * Доменный тип: Права доступа к очереди в Яндекс.Трекере
 *
 * Соответствует API v3: /v3/queues/{queueId}/permissions
 */

import type { WithUnknownFields } from './types.js';

/**
 * Роли пользователей в очереди
 *
 * @see https://cloud.yandex.ru/docs/tracker/manager/queue-access
 */
export type QueueRole = 'queue-lead' | 'team-member' | 'follower' | 'access';

/**
 * Права доступа к очереди
 *
 * ВАЖНО: Типизация основана на реальных ответах API v3.
 * Обязательные поля (без ?) всегда присутствуют в ответе.
 */
export interface QueuePermission {
  /** Идентификатор права доступа (всегда присутствует) */
  readonly id: string;

  /** URL ссылка на объект в API (всегда присутствует) */
  readonly self: string;

  /** Отображаемое имя (всегда присутствует) */
  readonly display: string;
}

/**
 * Права доступа с возможными unknown полями из API.
 * Используется при получении данных от API Трекера.
 */
export type QueuePermissionWithUnknownFields = WithUnknownFields<QueuePermission>;
