/**
 * DTO для поиска записей времени по всей организации (org-wide worklog search)
 *
 * API: POST /v3/worklog/_search
 *
 * ВАЖНО: `page`/`perPage` документированы только референсным клиентом
 * (`Worklog.search`, `collections.py`) — свежая официальная страница
 * `api-ref/issues/get-worklog.md` их не упоминает вовсе (см. отчёт задачи).
 * Клиент явно указывает ограничение `page * perPage <= 10000`. Взято из
 * клиента как более конкретный источник; если API их проигнорирует —
 * деградация безопасна (одна страница вместо N).
 */

export interface SearchWorklogDto {
  /** Логин или UID автора записи времени (опционально) */
  createdBy?: string | undefined;

  /** Начало диапазона дат создания (ISO 8601, опционально) */
  createdAtFrom?: string | undefined;

  /** Конец диапазона дат создания (ISO 8601, опционально) */
  createdAtTo?: string | undefined;

  /** Размер страницы (опционально, см. примечание об ограничении page*perPage) */
  perPage?: number | undefined;

  /** Непрозрачный курсор следующей страницы (опционально) */
  cursor?: string | undefined;

  /** Полный обход всех страниц (опционально) */
  fetchAll?: boolean | undefined;

  /** Лимит записей при fetchAll (опционально) */
  maxItems?: number | undefined;
}
