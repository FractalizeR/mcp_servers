/**
 * Доменный тип: Задача Яндекс.Трекера
 *
 * Соответствует API v3: /v3/issues/{issueKey}
 */

import type { WithUnknownFields } from './types.js';
import type { User } from './user.entity.js';
import type { Queue } from './queue.entity.js';
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

  /** Очередь, к которой относится задача (всегда присутствует) */
  readonly queue: Queue;

  /** Статус задачи (всегда присутствует) */
  readonly status: Status;

  /** Автор задачи (всегда присутствует) */
  readonly createdBy: User;

  /** Дата создания (ISO 8601) (всегда присутствует) */
  readonly createdAt: string;

  /** Дата последнего обновления (ISO 8601) (всегда присутствует) */
  readonly updatedAt: string;

  /** Подробное описание задачи (может отсутствовать) */
  readonly description?: string;

  /** Исполнитель задачи (может быть не назначен) */
  readonly assignee?: User;

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
