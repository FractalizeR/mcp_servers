/**
 * Доменный тип: Компонент очереди в Яндекс.Трекере
 *
 * Соответствует API v3:
 * - GET /v2/queues/{queueId}/components - список компонентов очереди
 * - POST /v2/queues/{queueId}/components - создание компонента
 * - PATCH /v2/components/{componentId} - обновление компонента
 * - DELETE /v2/components/{componentId} - удаление компонента
 *
 * Компоненты - это механизм для группировки задач внутри очереди.
 * Каждый компонент привязан к определенной очереди и может иметь
 * собственного руководителя и настройку автоназначения.
 */

import type { WithUnknownFields } from './types.js';
import type { UserRef } from './common/user-ref.entity.js';

/**
 * Референс на очередь (упрощенная версия)
 *
 * Используется в компоненте для указания на родительскую очередь.
 */
export interface QueueRef {
  /**
   * Идентификатор очереди
   * @example "1"
   */
  readonly id: string;

  /**
   * Ключ очереди
   * @example "QUEUE"
   */
  readonly key: string;

  /**
   * Отображаемое имя очереди
   * @example "My Queue"
   */
  readonly display: string;
}

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
   * @example "1"
   */
  readonly id: string;

  /**
   * URL ссылка на компонент в API
   * @example "https://api.tracker.yandex.net/v2/components/1"
   */
  readonly self: string;

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
