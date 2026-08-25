/**
 * Доменный тип: Запись времени в Яндекс.Трекере
 *
 * Соответствует API v3: /v3/issues/{issueId}/worklog
 *
 * ВАЖНО: пример ниже — из документации API, живым GET по worklog не
 * переснимался (в отличие от досок, проектов, глобальных полей и спринтов —
 * см. `.agentic-planning/plan_tracker_test_coverage/inventory/live-version-probe-2026-08-23.md`).
 * В частности, `version` документацией заявлен, но не подтверждён боевым
 * ответом. API возвращает записи времени в формате:
 * ```json
 * {
 *   "id": "123",
 *   "version": 1,
 *   "self": "https://api.tracker.yandex.net/v3/issues/TEST-1/worklog/123",
 *   "issue": {
 *     "id": "abc123",
 *     "key": "TEST-1",
 *     "display": "Test issue"
 *   },
 *   "comment": "Работал над задачей",
 *   "createdBy": { "self": "...", "id": "1", "display": "User" },
 *   "updatedBy": { "self": "...", "id": "1", "display": "User" },
 *   "createdAt": "2023-01-15T10:30:00.000+0000",
 *   "updatedAt": "2023-01-15T11:00:00.000+0000",
 *   "start": "2023-01-15T10:00:00.000+0000",
 *   "duration": "PT1H30M"
 * }
 * ```
 */

import type { WithUnknownFields } from './types.js';
import type { UserRef } from './common/user-ref.entity.js';

/**
 * Запись затраченного времени (worklog) в Яндекс.Трекере
 *
 * Представляет учет времени, затраченного на выполнение задачи.
 * Используется для трекинга рабочего времени и отчетности.
 *
 * ВАЖНО:
 * - duration использует формат ISO 8601 Duration (PT1H30M = 1 час 30 минут)
 * - start указывает когда началась работа (ISO 8601 timestamp)
 * - Все обязательные поля всегда присутствуют в ответе API
 */
export interface Worklog {
  /**
   * Уникальный идентификатор записи времени (всегда присутствует)
   * @example "123"
   */
  readonly id: string;

  /**
   * URL записи времени в API (всегда присутствует)
   * @example "https://api.tracker.yandex.net/v3/issues/TEST-1/worklog/123"
   */
  readonly self: string;

  /**
   * Версия записи (токен оптимистичной блокировки; по документации
   * увеличивается при каждом изменении записи).
   *
   * Источник: документация API v3 (не подтверждено боевым GET — live-probe
   * `inventory/live-version-probe-2026-08-23.md` worklog не покрывал, отсюда
   * `?`, а не безусловное поле как у Board/Project/Sprint). Мутации
   * `version` не отправляют — см. решение №2 плана
   * (`4.1_v3_migration_parallel.md`): оптимистичная блокировка в этапе 4.1
   * не вводится.
   */
  readonly version?: number;

  /**
   * Задача, к которой привязана запись времени (всегда присутствует)
   */
  readonly issue: {
    /** Идентификатор задачи */
    readonly id: string;
    /** Ключ задачи (например, TEST-1) */
    readonly key: string;
    /** Отображаемое название задачи */
    readonly display: string;
  };

  /**
   * Комментарий к записи времени (опционально)
   * Описывает, на что было затрачено время
   * @example "Работал над реализацией API"
   */
  readonly comment?: string;

  /**
   * Пользователь, создавший запись времени (всегда присутствует)
   */
  readonly createdBy: UserRef;

  /**
   * Пользователь, изменивший запись времени (может отсутствовать)
   */
  readonly updatedBy?: UserRef;

  /**
   * Дата создания записи (ISO 8601) (всегда присутствует)
   * @example "2023-01-15T10:30:00.000+0000"
   */
  readonly createdAt: string;

  /**
   * Дата последнего обновления записи (ISO 8601) (может отсутствовать)
   * @example "2023-01-15T11:00:00.000+0000"
   */
  readonly updatedAt?: string;

  /**
   * Дата и время начала работы (ISO 8601) (всегда присутствует)
   * Указывает, когда началась работа над задачей
   * @example "2023-01-15T10:00:00.000+0000"
   */
  readonly start: string;

  /**
   * Продолжительность работы в формате ISO 8601 Duration (всегда присутствует)
   *
   * Формат: PTnHnMnS, где:
   * - P - prefix (period)
   * - T - separator (time)
   * - H - hours
   * - M - minutes
   * - S - seconds
   *
   * @example "PT1H30M" - 1 час 30 минут
   * @example "PT2H" - 2 часа
   * @example "PT45M" - 45 минут
   * @example "PT30S" - 30 секунд
   */
  readonly duration: string;
}

/**
 * Worklog с возможными unknown полями из API.
 * Используется при получении данных от API Трекера.
 */
export type WorklogWithUnknownFields = WithUnknownFields<Worklog>;
