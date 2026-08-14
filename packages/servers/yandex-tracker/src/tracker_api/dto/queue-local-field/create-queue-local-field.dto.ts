/**
 * DTO для создания локального поля очереди
 *
 * API: POST /v3/queues/{queueId}/localFields
 */

export interface CreateQueueLocalFieldDto {
  /** Идентификатор или ключ очереди */
  queueId: string;

  /** Локальный идентификатор поля (короткий ключ, например 'myField') */
  id: string;

  /** Название поля на английском */
  nameEn: string;

  /** Название поля на русском */
  nameRu: string;

  /** Идентификатор категории поля (см. GET /v3/fields/categories) */
  category: string;

  /**
   * Тип поля, например 'ru.yandex.startrek.core.fields.StringFieldType',
   * 'ru.yandex.startrek.core.fields.DateFieldType',
   * 'ru.yandex.startrek.core.fields.IntegerFieldType'
   */
  type: string;
}
