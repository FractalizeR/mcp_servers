/**
 * Общие типы для пагинации
 *
 * Используются во всех API endpoints, поддерживающих постраничную выборку:
 * - Comments API
 * - Links API
 * - Attachments API
 * - Worklog API
 * - Projects API
 * - Components API
 */

/**
 * Параметры пагинации для запросов к API
 *
 * @example
 * ```typescript
 * const params: PaginationParams = {
 *   perPage: 50,
 *   page: 2
 * };
 * ```
 */
export interface PaginationParams {
  /**
   * Количество элементов на странице
   *
   * По умолчанию: 50
   * Максимум: зависит от endpoint (обычно 200-500)
   */
  readonly perPage?: number | undefined;

  /**
   * Непрозрачный курсор следующей страницы из `pagination.nextCursor`.
   *
   * Содержит зафиксированный путь+perPage предыдущего запроса; использовать
   * только с тем же инструментом, который его выдал. Несовместим с
   * `perPage`/`fetchAll`/`maxItems`/`maxTotalItems`.
   */
  readonly cursor?: string | undefined;
}

/**
 * Метаданные пагинации, прикладываемые к результату list-операций.
 *
 * Единый тип и для single-page (одна страница + признаки наличия ещё данных),
 * и для fetchAll (полный обход). Режимы различаются по флагам
 * `fetchedAll`/`truncated`/`hasError`.
 *
 * `total`/`totalPages` заполняются ТОЛЬКО когда ответ содержит `rel="seek"`
 * (seekable-эндпоинты: queues/projects/`_search`). Для чистого Link-cursor
 * (changelog/comments/...) их нет даже при наличии `X-Total-*` (seek-gating
 * против ложного `totalPages`) — ориентир `hasNextPage`/`nextCursor`.
 */
export interface PaginationMeta {
  /**
   * Непрозрачный курсор следующей страницы.
   *
   * Присутствует ⟺ `hasNextPage === true` (выводится из `Link rel="next"`).
   * Передайте его в `cursor` того же инструмента, чтобы получить следующую
   * страницу. Непагинируемые эндпоинты блок `pagination` не возвращают вовсе.
   */
  readonly nextCursor?: string | undefined;

  /** Размер страницы (если применимо к запросу) */
  readonly perPage?: number | undefined;

  /** Общее количество элементов (только при `rel="seek"` + `X-Total-Count`) */
  readonly total?: number | undefined;

  /** Общее количество страниц (только при `rel="seek"` + `X-Total-Pages`) */
  readonly totalPages?: number | undefined;

  /** Есть ли ещё данные за пределами возвращённых элементов */
  readonly hasNextPage: boolean;

  /** Возвращён полный набор данных (нет `hasNextPage` и не было ошибок) */
  readonly fetchedAll: boolean;

  /** Выдача обрезана защитным лимитом (`maxItems`/`maxPages`) */
  readonly truncated: boolean;

  /** Сколько страниц фактически загружено */
  readonly pagesFetched: number;

  /**
   * При обходе произошла ошибка после сбора части страниц.
   *
   * Возвращён частичный результат: `fetchedAll=false`, собранные ранее
   * страницы не потеряны.
   */
  readonly hasError: boolean;
}

/**
 * Результат list-операции: элементы + метаданные пагинации.
 *
 * Сквозной контракт для всех пагинируемых endpoint'ов
 * (changelog, comments, worklog, links, attachments, components,
 * checklist, queues, projects, find_issues).
 */
export interface PaginatedResult<T> {
  /** Элементы (возможно усечённые до `maxItems`) */
  readonly items: T[];

  /** Метаданные пагинации */
  readonly pagination: PaginationMeta;
}
