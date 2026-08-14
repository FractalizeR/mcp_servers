/**
 * Доменный тип: Локальное поле очереди в Яндекс.Трекере
 *
 * Соответствует API v3: /v3/queues/{queueId}/localFields/{id}
 *
 * ВАЖНО (нюанс из референсного клиента, `collections.py:QueueLocalFields.update_field`):
 * локальное поле обслуживается ДВУМЯ разными хендлами — глобальным GET-only
 * `/v3/localFields/{id}` (длинный id вида `<hex>--myField`, приходит в `self`)
 * и queue-scoped, который ТОЛЬКО он принимает PATCH и адресуется коротким
 * `key` ('myField'), а не `self`/`id`. `update_queue_local_field` в этом
 * сервере обязан использовать `key`, а не `id`/`self` — иначе PATCH уйдёт
 * не туда (см. `update-queue-local-field.operation.ts`).
 */

import type { WithUnknownFields } from './types.js';

/**
 * Локальное поле очереди
 *
 * ВАЖНО: Типизация основана на референсном клиенте (`QueueLocalFields.fields`).
 * Обязательные поля (без ?) всегда присутствуют в ответе списка.
 */
export interface QueueLocalField {
  /** Глобальный идентификатор поля (всегда присутствует) */
  readonly id: string;

  /** URL ссылка на поле (глобальный GET-only хендл, всегда присутствует) */
  readonly self: string;

  /** Короткий ключ поля в рамках очереди — используется для PATCH (всегда присутствует) */
  readonly key: string;

  /** Название поля (всегда присутствует) */
  readonly name: string;

  /** Версия поля (может отсутствовать) */
  readonly version?: number;

  /** Описание поля (может отсутствовать) */
  readonly description?: string;

  /** Категория поля (может отсутствовать) */
  readonly category?: unknown;

  /** Только для чтения (может отсутствовать) */
  readonly readonly?: boolean;

  /** Варианты значений (может отсутствовать, для select-полей) */
  readonly options?: unknown;

  /** Тип поля (может отсутствовать, например 'ru.yandex.startrek.core.fields.StringFieldType') */
  readonly type?: string;

  /** Очередь, к которой привязано поле (может отсутствовать) */
  readonly queue?: unknown;

  /** Порядок отображения (может отсутствовать) */
  readonly order?: number;
}

/**
 * Локальное поле очереди с возможными unknown полями из API.
 * Используется при получении данных от API Трекера.
 */
export type QueueLocalFieldWithUnknownFields = WithUnknownFields<QueueLocalField>;
