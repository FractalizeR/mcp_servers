/**
 * Input DTO для batch-получения истории изменений задач (с пагинацией).
 *
 * API v3: GET /v3/issues/{issueKey}/changelog
 *
 * Параметры пагинации применяются ОДИНАКОВО ко всем задачам batch'а
 * (общие параметры для GET-batch, см. CLAUDE.md «Batch Operations Pattern»).
 *
 * ВАЖНО: импортируется прямым путём (не через barrel) — это домен changelog.
 */
export interface GetIssueChangelogInputDto {
  /**
   * Номер страницы (с 1). Игнорируется при fetchAll=true.
   */
  page?: number | undefined;

  /**
   * Количество записей на странице.
   */
  perPage?: number | undefined;

  /**
   * Полный обход всех страниц истории (opt-in).
   *
   * Если true — обойти все страницы по `Link rel="next"` с защитным лимитом
   * maxItems. Несовместимо с явным page.
   */
  fetchAll?: boolean | undefined;

  /**
   * Защитный лимит по количеству записей на одну задачу при fetchAll=true.
   *
   * По умолчанию 500 (применяет паджинатор). При срабатывании в метаданных
   * выставляется pagination.truncated=true.
   */
  maxItems?: number | undefined;
}
