/**
 * DTO для обновления локального поля очереди
 *
 * ВАЖНО (нюанс из референсного клиента,
 * `QueueLocalFields.update_field`/`queue-local-field.entity.ts`): поле
 * адресуется коротким `key` ('myField'), НЕ глобальным `id`/`self`
 * ('<hex>--myField') — только queue-scoped хендл принимает PATCH.
 *
 * API: PATCH /v3/queues/{queueId}/localFields/{key}
 */

export interface UpdateQueueLocalFieldDto {
  /** Идентификатор или ключ очереди */
  queueId: string;

  /** Короткий ключ локального поля (НЕ глобальный id/self) */
  key: string;

  /** Новое название поля на английском (опционально) */
  nameEn?: string | undefined;

  /** Новое название поля на русском (опционально) */
  nameRu?: string | undefined;

  /** Идентификатор категории поля (опционально) */
  category?: string | undefined;

  /** Порядок отображения (опционально) */
  order?: number | undefined;

  /** Описание поля (опционально) */
  description?: string | undefined;

  /** Только для чтения (опционально) */
  readonly?: boolean | undefined;

  /** Видимость поля (опционально) */
  visible?: boolean | undefined;

  /** Скрыто ли поле (опционально) */
  hidden?: boolean | undefined;
}
