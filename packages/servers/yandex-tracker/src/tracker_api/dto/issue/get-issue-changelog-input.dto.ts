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
   * Непрозрачный курсор следующей страницы (из pagination.nextCursor).
   *
   * Кодирует относительный путь предыдущего запроса. При наличии операция
   * делает ровно один запрос по декодированному пути (perPage/page уже в нём).
   */
  cursor?: string | undefined;

  /**
   * Количество записей на странице.
   */
  perPage?: number | undefined;

  /**
   * Полный обход всех страниц истории (opt-in).
   *
   * Если true — обойти все страницы по `Link rel="next"` с защитным лимитом
   * maxItems. Несовместимо с явным cursor.
   */
  fetchAll?: boolean | undefined;

  /**
   * Защитный лимит по количеству записей на одну задачу при fetchAll=true.
   *
   * По умолчанию 500 (применяет паджинатор). При срабатывании в метаданных
   * выставляется pagination.truncated=true.
   */
  maxItems?: number | undefined;
  /**
   * Общий потолок записей на весь batch-ответ при `fetchAll=true`.
   *
   * Дефолт применяет операция (`DEFAULT_MAX_TOTAL_ITEMS`). По достижении
   * оставшиеся задачи отдают только собранное с `pagination.truncated=true`.
   */
  maxTotalItems?: number | undefined;
}
