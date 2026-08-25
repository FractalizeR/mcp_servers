/**
 * Референс на очередь (облегченная версия Queue)
 *
 * Используется везде, где объект ссылается на очередь, но не несёт её настроек:
 * - Issue.queue
 * - Component.queue
 * - Project.queues
 *
 * Форма подтверждена живым GET к боевому API 2026-08-19 на ДВУХ РАЗНЫХ
 * эндпоинтах: `/v3/issues/{key}` для `Issue.queue` и `/v2/queues/{id}/components`
 * (на тот момент — путь `GetComponentsOperation`, с миграции 4.1 операция ходит
 * на `/v3/queues/{id}/components`, в этом виде не наблюдался) для
 * `Component.queue`. Оба эндпоинта отдают одни и те же четыре поля — это
 * совпадение формы двух разных ресурсов, а не проверка одного ресурса на
 * обеих версиях API.
 */

import type { WithUnknownFields } from '../types.js';

/**
 * Референс на очередь
 */
export interface QueueRef {
  /**
   * URL ссылка на очередь в API
   * @example "https://api.tracker.yandex.net/v3/queues/QUEUE"
   */
  readonly self: string;

  /**
   * Идентификатор очереди
   *
   * Строка, в отличие от числового `Queue.id`: API отдаёт числовой id у полной
   * сущности и строковый — у ref на неё (подтверждено на queues/components/users).
   * @example "5"
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
 * QueueRef с возможными unknown полями из API.
 * Используется при получении данных от API Трекера.
 */
export type QueueRefWithUnknownFields = WithUnknownFields<QueueRef>;
