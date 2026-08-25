/**
 * Доменный тип: Компонент очереди в Яндекс.Трекере
 *
 * Соответствует API v3:
 * - GET /v3/queues/{queueId}/components - список компонентов очереди
 * - POST /v3/components - создание компонента (очередь — ключ в теле, `queue`, не в пути;
 *   D1, `0_CONTRACTS.md`: `POST /v3/queues/{queueId}/components` в API не существует)
 * - PATCH /v3/components/{componentId} - обновление компонента
 * - DELETE /v3/components/{componentId} - удаление компонента
 *
 * Компоненты - это механизм для группировки задач внутри очереди.
 * Каждый компонент привязан к определенной очереди и может иметь
 * собственного руководителя и настройку автоназначения.
 */

import type { WithUnknownFields } from './types.js';
import type { UserRef } from './common/user-ref.entity.js';
import type { QueueRef } from './common/queue-ref.entity.js';

/**
 * Компонент очереди в Яндекс.Трекере
 *
 * ВАЖНО: Типизация основана на реальных ответах API v2/v3.
 * Обязательные поля (без ?) всегда присутствуют в ответе API.
 * Опциональные поля могут отсутствовать в зависимости от настроек компонента.
 */
export interface Component {
  /**
   * Уникальный идентификатор компонента
   *
   * Число, а не строка: живой GET `/v3/components` 2026-08-19 отдаёт `4`, `5`, `16`.
   * @example 4
   */
  readonly id: number;

  /**
   * URL ссылка на компонент в API
   * @example "https://api.tracker.yandex.net/v3/components/1"
   */
  readonly self: string;

  /**
   * Версия компонента (optimistic locking)
   *
   * PATCH без версии отвечает 428 — правка компонента без неё невозможна вовсе
   * (живая проба 2026-08-25).
   */
  readonly version: number;

  /**
   * Название компонента
   * @example "Backend"
   */
  readonly name: string;

  /**
   * Очередь, к которой привязан компонент
   *
   * ВАЖНО: Компонент всегда принадлежит конкретной очереди.
   * Изменить очередь компонента нельзя - только при создании.
   */
  readonly queue: QueueRef;

  /**
   * Автоматическое назначение исполнителя
   *
   * Если true, задачи с этим компонентом будут автоматически
   * назначаться на руководителя компонента.
   *
   * @default false
   */
  readonly assignAuto: boolean;

  /**
   * Описание компонента (может отсутствовать)
   * @example "Backend services and APIs"
   */
  readonly description?: string;

  /**
   * Руководитель компонента (может отсутствовать)
   *
   * Если assignAuto = true, задачи будут назначаться на этого пользователя.
   */
  readonly lead?: UserRef;
}

/**
 * Компонент с возможными unknown полями из API.
 * Используется при получении данных от API Трекера.
 */
export type ComponentWithUnknownFields = WithUnknownFields<Component>;
