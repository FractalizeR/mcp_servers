/**
 * Доменный тип: Очередь задач в Яндекс.Трекере
 *
 * Соответствует API v3: /v3/queues/{queueId}
 */

import type { WithUnknownFields } from './types.js';
import type { UserRef } from './common/user-ref.entity.js';

/**
 * Референс на тип задачи, приоритет или другой справочник
 */
export interface QueueDictionaryRef {
  /** Идентификатор */
  readonly id: string;

  /** Ключ */
  readonly key: string;

  /** Отображаемое имя */
  readonly display: string;
}

/**
 * Конфигурация типа задачи в очереди
 */
export interface QueueIssueTypeConfig {
  /** Тип задачи */
  readonly issueType: {
    readonly id: string;
  };

  /** Воркфлоу для этого типа */
  readonly workflow: {
    readonly id: string;
  };

  /** Возможные резолюции */
  readonly resolutions: ReadonlyArray<{
    readonly id: string;
  }>;
}

/**
 * Очередь задач в Яндекс.Трекере
 *
 * ВАЖНО: Типизация основана на реальных ответах API v3.
 * Обязательные поля (без ?) всегда присутствуют в ответе GET /v3/queues/{queueId}.
 * Опциональные поля могут отсутствовать в зависимости от настроек очереди.
 */
export interface Queue {
  /** Идентификатор очереди (всегда присутствует) */
  readonly id: string;

  /** URL ссылка на очередь в API (всегда присутствует) */
  readonly self: string;

  /** Ключ очереди (например, QUEUE) (всегда присутствует) */
  readonly key: string;

  /** Версия очереди (для оптимистичных блокировок) (всегда присутствует) */
  readonly version: number;

  /** Название очереди (всегда присутствует) */
  readonly name: string;

  /** Руководитель очереди (всегда присутствует) */
  readonly lead: UserRef;

  /** Автоматическое назначение исполнителя (всегда присутствует) */
  readonly assignAuto: boolean;

  /** Тип задачи по умолчанию (всегда присутствует) */
  readonly defaultType: QueueDictionaryRef;

  /** Приоритет по умолчанию (всегда присутствует) */
  readonly defaultPriority: QueueDictionaryRef;

  /** Описание очереди (может отсутствовать) */
  readonly description?: string;

  /** Доступные типы задач в очереди (может отсутствовать) */
  readonly issueTypes?: ReadonlyArray<QueueDictionaryRef>;

  /** Воркфлоу для типов задач (может отсутствовать) */
  readonly workflows?: Record<
    string,
    ReadonlyArray<{ readonly id: string; readonly display: string }>
  >;

  /** Запрет голосования за задачи (может отсутствовать) */
  readonly denyVoting?: boolean;

  /** Конфигурация типов задач с воркфлоу и резолюциями (может отсутствовать) */
  readonly issueTypesConfig?: ReadonlyArray<QueueIssueTypeConfig>;
}

/**
 * Очередь с возможными unknown полями из API.
 * Используется при получении данных от API Трекера.
 */
export type QueueWithUnknownFields = WithUnknownFields<Queue>;
