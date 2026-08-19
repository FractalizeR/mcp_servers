/**
 * Доменный тип: Задача Яндекс.Трекера
 *
 * Соответствует API v3: /v3/issues/{issueKey}
 */

import type { WithUnknownFields } from './types.js';
import type { UserRef } from './common/user-ref.entity.js';
import type { QueueRef } from './common/queue-ref.entity.js';
import type { Status } from './status.entity.js';
import type { Priority } from './priority.entity.js';
import type { IssueType } from './issue-type.entity.js';

/**
 * Задача в Яндекс.Трекере
 *
 * ВАЖНО: Типизация основана на реальных ответах API v3.
 * Обязательные поля (без ?) всегда присутствуют в ответе GET /v3/issues/{key}.
 * Опциональные поля могут отсутствовать в зависимости от настроек задачи.
 */
export interface Issue {
  /** Идентификатор задачи (всегда присутствует) */
  readonly id: string;

  /** Ключ задачи (например, QUEUE-123) (всегда присутствует) */
  readonly key: string;

  /** Краткое описание задачи (всегда присутствует) */
  readonly summary: string;

  /**
   * Очередь, к которой относится задача (всегда присутствует)
   *
   * Ref, а не полная `Queue`: API отдаёт здесь только `{self, id, key, display}`
   * (живой GET `/v3/issues/{key}` 2026-08-19). За настройками очереди — отдельный
   * запрос к `/v3/queues/{key}`.
   */
  readonly queue: QueueRef;

  /**
   * Статус задачи
   * ВАЖНО: В большинстве случаев присутствует, но API может вернуть неполный ответ
   */
  readonly status?: Status;

  /**
   * Автор задачи (всегда присутствует)
   *
   * Ref, а не полный `User`: ни `login`, ни `uid`, ни `email` здесь не приходят
   * (живой GET `/v3/issues/{key}` 2026-08-19). За ними — `get_users` по `id`.
   */
  readonly createdBy: UserRef;

  /** Дата создания (ISO 8601) (всегда присутствует) */
  readonly createdAt: string;

  /** Дата последнего обновления (ISO 8601) (всегда присутствует) */
  readonly updatedAt: string;

  /** Подробное описание задачи (может отсутствовать) */
  readonly description?: string;

  /** Исполнитель задачи (может быть не назначен). Ref, как и `createdBy`. */
  readonly assignee?: UserRef;

  /** Приоритет задачи (может быть не указан) */
  readonly priority?: Priority;

  /** Тип задачи (может быть не указан) */
  readonly type?: IssueType;
}

/**
 * Задача с возможными unknown полями из API.
 * Используется при получении данных от API Трекера.
 */
export type IssueWithUnknownFields = WithUnknownFields<Issue>;
