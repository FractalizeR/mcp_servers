/**
 * Input DTO для получения списка компонентов очереди
 *
 * API: GET /v2/queues/{queueId}/components
 *
 * ВАЖНО: API компонентов НЕ пагинирует (Link rel="next" отсутствует) —
 * возвращает все компоненты очереди одним ответом. Пагинационных параметров
 * (page/perPage/fetchAll/maxItems) и курсора у операции нет.
 */
export interface GetComponentsInput {
  /** Ключ или ID очереди (например, 'QUEUE' или '1'). */
  queueId: string;
}
