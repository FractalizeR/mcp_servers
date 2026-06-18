/**
 * Input DTO для получения списка компонентов очереди
 *
 * API: GET /v2/queues/{queueId}/components
 *
 * Параметры пагинации опциональны:
 * - по умолчанию (`fetchAll` не задан/false) — одна страница + метаданные;
 * - `fetchAll=true` — полный обход с защитным лимитом `maxItems`.
 *
 * ВАЖНО: По наблюдению, API компонентов не пагинирует (возвращает все
 * компоненты сразу), поэтому в single-page режиме обычно `hasNextPage=false`.
 * Параметры сохранены для единообразия контракта list-операций.
 */
export interface GetComponentsInput {
  /** Ключ или ID очереди (например, 'QUEUE' или '1'). */
  queueId: string;

  /** Номер страницы (с 1). Игнорируется при fetchAll=true. */
  page?: number | undefined;

  /** Количество записей на странице. */
  perPage?: number | undefined;

  /** Если true — обойти все страницы по Link rel="next". */
  fetchAll?: boolean | undefined;

  /** Максимум записей на цепочку при fetchAll=true (по умолчанию 500). */
  maxItems?: number | undefined;
}
