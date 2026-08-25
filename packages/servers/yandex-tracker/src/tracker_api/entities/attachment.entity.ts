/**
 * Доменный тип: Прикрепленный файл к задаче Яндекс.Трекера
 *
 * Соответствует API v3: /v3/issues/{issueId}/attachments
 *
 * ВАЖНО: Типизация основана на документации API Яндекс.Трекера.
 * Обязательные поля (readonly) всегда присутствуют в ответе API.
 * Опциональные поля могут отсутствовать в зависимости от контекста.
 */

import type { WithUnknownFields } from './types.js';
import type { UserRef } from './common/user-ref.entity.js';

/**
 * Прикрепленный файл (вложение) в Яндекс.Трекере
 *
 * Представляет файл, прикрепленный к задаче.
 * Может быть изображением, документом или любым другим типом файла.
 */
export interface Attachment {
  /** Уникальный идентификатор файла (всегда присутствует) */
  readonly id: string;

  /** URL ресурса для self-reference (всегда присутствует) */
  readonly self: string;

  /** Имя файла (всегда присутствует) */
  readonly name: string;

  /** URL для скачивания файла (всегда присутствует) */
  readonly content: string;

  /** URL миниатюры изображения (присутствует только для изображений) */
  readonly thumbnail?: string;

  /** Автор загрузки файла (всегда присутствует) */
  readonly createdBy: UserRef;

  /** Дата создания (ISO 8601) (всегда присутствует) */
  readonly createdAt: string;

  /** MIME тип файла (всегда присутствует) */
  readonly mimetype: string;

  /** Размер файла в байтах (всегда присутствует) */
  readonly size: number;
}

/**
 * Attachment с возможными unknown полями из API.
 * Используется при получении данных от API Трекера.
 */
export type AttachmentWithUnknownFields = WithUnknownFields<Attachment>;
