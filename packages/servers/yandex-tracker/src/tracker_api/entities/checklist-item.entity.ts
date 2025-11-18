/**
 * Доменный тип: Элемент чеклиста задачи Яндекс.Трекера
 *
 * Соответствует API v2: /v2/issues/{issueId}/checklistItems
 *
 * ВАЖНО: Типизация основана на документации API Яндекс.Трекера.
 * Обязательные поля (readonly) всегда присутствуют в ответе API.
 * Опциональные поля могут отсутствовать в зависимости от контекста.
 */

import type { WithUnknownFields } from './types.js';
import type { UserRef } from './common/user-ref.entity.js';

/**
 * Элемент чеклиста в задаче Яндекс.Трекера
 *
 * Представляет одну задачу в чеклисте, которую нужно выполнить.
 * Может иметь назначенное лицо и дедлайн.
 */
export interface ChecklistItem {
  /** Уникальный идентификатор элемента чеклиста (всегда присутствует) */
  readonly id: string;

  /** Текст элемента чеклиста (всегда присутствует) */
  readonly text: string;

  /** Статус выполнения элемента (всегда присутствует) */
  readonly checked: boolean;

  /** Назначенное лицо (опционально) */
  readonly assignee?: UserRef;

  /** Дедлайн выполнения элемента в формате ISO 8601 (опционально) */
  readonly deadline?: string;
}

/**
 * ChecklistItem с возможными unknown полями из API.
 * Используется при получении данных от API Трекера.
 */
export type ChecklistItemWithUnknownFields = WithUnknownFields<ChecklistItem>;
