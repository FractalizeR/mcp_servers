/**
 * Доменный тип: Пользователь Яндекс.Трекера
 *
 * Соответствует API v3: /v3/myself, /v3/users/{userId}
 *
 * ВАЖНО: Типизация основана на реальных ответах API v3.
 * Обязательные поля (readonly) всегда присутствуют в ответе API.
 * Опциональные поля могут отсутствовать в зависимости от контекста.
 */

import type { WithUnknownFields } from './types.js';

export interface User {
  /**
   * Уникальный идентификатор пользователя (всегда присутствует)
   *
   * Число, а не строка: подтверждено живым GET `/v3/myself` и `/v3/users/{uid}`
   * 2026-08-19. Строковый id отдают только ref-ы на пользователя (см. `UserRef`).
   */
  readonly uid: number;

  /** Отображаемое имя пользователя (всегда присутствует) */
  readonly display: string;

  /** Логин пользователя (всегда присутствует) */
  readonly login: string;

  /** Email пользователя (может отсутствовать, если не настроен) */
  readonly email?: string;

  /** Имя пользователя (может отсутствовать) */
  readonly firstName?: string;

  /** Фамилия пользователя (может отсутствовать) */
  readonly lastName?: string;

  /**
   * Признак того, что пользователь уволен
   *
   * Заменил несуществовавшее `isActive`: запрос `/v3/users/{uid}` с явным
   * `fields=["isActive"]` 2026-08-19 вернул только `uid` и `dismissed` — поля
   * `isActive` в API нет. Обрати внимание на инверсию смысла при чтении.
   */
  readonly dismissed?: boolean;
}

/**
 * Пользователь с возможными unknown полями из API.
 * Используется при получении данных от API Трекера.
 */
export type UserWithUnknownFields = WithUnknownFields<User>;
