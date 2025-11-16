/**
 * Доменный тип: Запись истории изменений задачи
 *
 * Соответствует API v3: /v3/issues/{issueKey}/changelog
 */

import type { WithUnknownFields } from './types.js';
import type { User } from './user.entity.js';

/**
 * Изменённое поле в истории
 */
export interface ChangelogField {
  /** Идентификатор поля */
  readonly field: {
    readonly id: string;
    readonly display: string;
  };

  /** Старое значение */
  readonly from?: unknown;

  /** Новое значение */
  readonly to?: unknown;
}

/**
 * Запись в истории изменений задачи
 *
 * ВАЖНО: Типизация основана на Python SDK и API v3.
 * Представляет одно изменение задачи (обновление полей, комментарий и т.д.)
 */
export interface ChangelogEntry {
  /** Идентификатор записи */
  readonly id: string;

  /** URL записи */
  readonly self: string;

  /** Задача, к которой относится изменение */
  readonly issue: {
    readonly id: string;
    readonly key: string;
    readonly display: string;
  };

  /** Дата и время изменения (ISO 8601) */
  readonly updatedAt: string;

  /** Пользователь, внёсший изменение */
  readonly updatedBy: User;

  /** Тип изменения (IssueUpdated, IssueCreated, IssueMoved и т.д.) */
  readonly type: string;

  /** Способ внесения изменения (web, email, api и т.д.) */
  readonly transport?: string;

  /** Список изменённых полей */
  readonly fields?: ChangelogField[];

  /** Вложения (если добавлены/удалены) */
  readonly attachments?: unknown[];

  /** Комментарии (если добавлены) */
  readonly comments?: unknown[];

  /** Worklog записи (если добавлены) */
  readonly worklog?: unknown[];

  /** Сообщения */
  readonly messages?: unknown[];

  /** Связи задач */
  readonly links?: unknown[];

  /** Ранги */
  readonly ranks?: unknown[];
}

/**
 * Запись истории с возможными unknown полями из API.
 * Используется при получении данных от API Трекера.
 */
export type ChangelogEntryWithUnknownFields = WithUnknownFields<ChangelogEntry>;
