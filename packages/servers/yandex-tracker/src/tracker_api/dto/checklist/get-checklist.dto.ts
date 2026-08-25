/**
 * Input DTO для получения чеклиста задачи
 *
 * API: GET /v3/issues/{issueId}/checklistItems
 *
 * Параметры пагинации опциональны:
 * - по умолчанию (`fetchAll` не задан/false) — одна страница + метаданные
 *   (`pagination.nextCursor` для следующей);
 * - `cursor` — продолжение с конкретной страницы (декодируется в путь);
 * - `fetchAll=true` — полный обход по Link rel="next" с защитным лимитом `maxItems`.
 */
export interface GetChecklistInput {
  /** Идентификатор или ключ задачи (например, 'QUEUE-123'). */
  issueId: string;

  /** Непрозрачный курсор следующей страницы (из `pagination.nextCursor`). */
  cursor?: string | undefined;

  /** Количество записей на странице. */
  perPage?: number | undefined;

  /** Если true — обойти все страницы по Link rel="next". */
  fetchAll?: boolean | undefined;

  /** Максимум записей на цепочку при fetchAll=true (по умолчанию 500). */
  maxItems?: number | undefined;
  /**
   * Общий потолок записей на весь batch-ответ при `fetchAll=true`.
   *
   * Дефолт применяет операция (`DEFAULT_MAX_TOTAL_ITEMS`). По достижении
   * оставшиеся задачи отдают только собранное с `pagination.truncated=true`.
   */
  maxTotalItems?: number | undefined;
}
