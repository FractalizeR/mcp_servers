/**
 * Доменный тип: Комментарий к задаче Яндекс.Трекера
 *
 * Соответствует API v3: /v3/issues/{issueId}/comments
 */

import type { WithUnknownFields } from '../types.js';
import type { UserRef } from '../common/user-ref.entity.js';

/**
 * Вложение в комментарии
 */
export interface CommentAttachment {
  /** Идентификатор вложения */
  readonly id: string;

  /** Имя файла */
  readonly name: string;

  /** Размер файла в байтах */
  readonly size: number;
}

/**
 * Комментарий к задаче
 *
 * ВАЖНО: Типизация основана на документации API v3.
 * Обязательные поля (без ?) всегда присутствуют в ответе.
 * Опциональные поля могут отсутствовать в зависимости от контекста.
 */
export interface Comment {
  /** Идентификатор комментария (всегда присутствует) */
  readonly id: string;

  /** URL ссылка на комментарий в API (всегда присутствует) */
  readonly self: string;

  /** Текст комментария (всегда присутствует) */
  readonly text: string;

  /** Автор комментария (всегда присутствует) */
  readonly createdBy: UserRef;

  /** Дата создания комментария в формате ISO 8601 (всегда присутствует) */
  readonly createdAt: string;

  /** Пользователь, который последним изменил комментарий */
  readonly updatedBy?: UserRef;

  /** Дата последнего изменения в формате ISO 8601 */
  readonly updatedAt?: string;

  /** Версия комментария (для оптимистичной блокировки) */
  readonly version?: number;

  /** Способ доставки комментария */
  readonly transport?: 'internal' | 'email';

  /** Вложения в комментарии */
  readonly attachments?: readonly CommentAttachment[];
}

/**
 * Комментарий с возможными unknown полями из API.
 * Используется при получении данных от API Трекера.
 */
export type CommentWithUnknownFields = WithUnknownFields<Comment>;
