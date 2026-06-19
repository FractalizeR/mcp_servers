/**
 * DTO параметров получения связей задачи (list, с пагинацией).
 *
 * Используется в GetIssueLinksOperation / IssueLinkService.getIssueLinks.
 *
 * Семантика пагинации:
 * - по умолчанию (`fetchAll` не задан/false) — одна страница + метаданные;
 *   листать вручную через `page`;
 * - `fetchAll=true` — полный обход по `Link rel="next"` с защитным `maxItems`.
 *
 * API: GET /v3/issues/{issueId}/links
 */
export interface GetIssueLinksInput {
  /** Номер страницы (с 1). Игнорируется при `fetchAll=true`. */
  page?: number | undefined;

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
