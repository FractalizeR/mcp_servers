/**
 * DTO параметров получения записей времени задачи (list, с пагинацией).
 *
 * Используется в GetWorklogsOperation / WorklogService.getWorklogs[Many].
 *
 * Семантика пагинации:
 * - по умолчанию (`fetchAll` не задан/false) — одна страница + метаданные;
 *   листать через `cursor` (значение `pagination.nextCursor` предыдущего ответа);
 * - `fetchAll=true` — полный обход по `Link rel="next"` с защитным `maxItems`.
 *
 * API: GET /v2/issues/{issueId}/worklog
 */
export interface GetWorklogsInput {
  /**
   * Непрозрачный курсор следующей страницы (из `pagination.nextCursor`).
   *
   * Несовместим с `perPage`/`fetchAll`/`maxItems`/`maxTotalItems` (размер
   * страницы зафиксирован внутри курсора).
   */
  cursor?: string | undefined;

  /** Размер страницы. При `fetchAll=true` поднимается к рекомендуемому максимуму. */
  perPage?: number | undefined;

  /** Opt-in полного обхода всех страниц по `Link rel="next"`. */
  fetchAll?: boolean | undefined;

  /** Максимум записей на одну цепочку при `fetchAll=true` (дефолт применяет паджинатор). */
  maxItems?: number | undefined;
  /**
   * Общий потолок записей на весь batch-ответ при `fetchAll=true`.
   *
   * Дефолт применяет операция (`DEFAULT_MAX_TOTAL_ITEMS`). По достижении
   * оставшиеся задачи отдают только собранное с `pagination.truncated=true`.
   */
  maxTotalItems?: number | undefined;
}
