/**
 * Доменный тип: Задача Яндекс.Трекера
 *
 * Соответствует API v3: /v3/issues/{issueKey}
 */

import type { User } from '@domain/entities/user.entity.js';

/**
 * Очередь задач
 *
 * ВАЖНО: Все поля обязательны - API всегда возвращает полную информацию о очереди.
 */
export interface Queue {
  /** Идентификатор очереди */
  readonly id: string;

  /** Ключ очереди */
  readonly key: string;

  /** Название очереди */
  readonly name: string;
}

/**
 * Статус задачи
 *
 * ВАЖНО: Все поля обязательны - API всегда возвращает полную информацию о статусе.
 */
export interface Status {
  /** Идентификатор статуса */
  readonly id: string;

  /** Ключ статуса */
  readonly key: string;

  /** Название статуса */
  readonly display: string;
}

/**
 * Приоритет задачи
 *
 * ВАЖНО: Все поля обязательны - API всегда возвращает полную информацию о приоритете.
 */
export interface Priority {
  /** Идентификатор приоритета */
  readonly id: string;

  /** Ключ приоритета */
  readonly key: string;

  /** Название приоритета */
  readonly display: string;
}

/**
 * Тип задачи
 *
 * ВАЖНО: Все поля обязательны - API всегда возвращает полную информацию о типе.
 */
export interface IssueType {
  /** Идентификатор типа */
  readonly id: string;

  /** Ключ типа */
  readonly key: string;

  /** Название типа */
  readonly display: string;
}

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
 * Параметры для создания задачи
 */
export interface CreateIssueRequest {
  /** Ключ очереди (обязательно) */
  queue: string;

  /** Краткое описание (обязательно) */
  summary: string;

  /** Подробное описание */
  description?: string;

  /** Исполнитель (логин или UID) */
  assignee?: string;

  /** Приоритет (ключ приоритета) */
  priority?: string;

  /** Тип задачи (ключ типа) */
  type?: string;

  /** Дополнительные поля */
  [key: string]: unknown;
}

/**
 * Параметры для обновления задачи
 */
export interface UpdateIssueRequest {
  /** Краткое описание */
  summary?: string;

  /** Подробное описание */
  description?: string;

  /** Исполнитель (логин или UID) */
  assignee?: string;

  /** Приоритет (ключ приоритета) */
  priority?: string;

  /** Тип задачи (ключ типа) */
  type?: string;

  /** Статус (ключ статуса) */
  status?: string;

  /** Дополнительные поля */
  [key: string]: unknown;
}

/**
 * Параметры для поиска задач
 */
export interface SearchIssuesParams {
  /** Очередь */
  queue?: string;

  /** Статус */
  status?: string;

  /** Исполнитель */
  assignee?: string;

  /** Автор */
  createdBy?: string;

  /** Приоритет */
  priority?: string;

  /** Текст для поиска */
  query?: string;

  /** Дополнительные фильтры */
  [key: string]: unknown;
}
