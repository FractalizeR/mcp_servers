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
  /** Уникальный идентификатор пользователя (всегда присутствует) */
  readonly uid: string;

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

  /** Признак активности пользователя (всегда присутствует) */
  readonly isActive: boolean;
}

/**
 * Пользователь с возможными unknown полями из API.
 * Используется при получении данных от API Трекера.
 */
export type UserWithUnknownFields = WithUnknownFields<User>;
