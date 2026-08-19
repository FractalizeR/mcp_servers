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
   * Если не задано агентом — курсорные (не-seek) операции подставляют
   * `DEFAULT_PER_PAGE` (см. `tracker-paginator.util.ts`) как СВОЙ явный
   * дефолт: настоящий дефолт API Яндекс.Трекера не задокументирован и не
   * подтверждён (см. JSDoc `DEFAULT_PER_PAGE`) — угадывать его нельзя,
   * поэтому значение шлётся явно.
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
   * ВАЖНО (инвариант изменён находкой №3, внешнее ревью 2026-08): курсор
   * присутствует всегда, когда сервер реально прислал `Link rel="next"` —
   * НЕЗАВИСИМО от `hasNextPage`. Раньше действовал инвариант «присутствует
   * ⟺ `hasNextPage === true`»; он давал необнаружимую потерю данных, когда
   * sanity-эвристика `hasNextPage` (сравнение размера страницы с `perPage`)
   * ошибочно гасила признак «есть данные» — курсор гасился вместе с ним, и
   * агент физически не мог дочитать остаток. Эвристика может ошибаться в
   * обе стороны: подтверждено вживую, что `/v2/issues/{id}/checklistItems`
   * игнорирует `perPage` (запрошен `perPage=1`, получено 4 элемента).
   *
   * Новая семантика: `hasNextPage` — «мы уверены, что дальше есть данные»;
   * `nextCursor` — «вот чем дочитать, если хочешь проверить сам» (курсору
   * можно доверять, он приходит от сервера, а не из эвристики). Передайте
   * его в `cursor` того же инструмента, чтобы получить следующую страницу.
   * Непагинируемые эндпоинты блок `pagination` не возвращают вовсе.
   */
  readonly nextCursor?: string | undefined;

  /** Размер страницы (если применимо к запросу) */
  readonly perPage?: number | undefined;

  /** Общее количество элементов (только при `rel="seek"` + `X-Total-Count`) */
  readonly total?: number | undefined;

  /** Общее количество страниц (только при `rel="seek"` + `X-Total-Pages`) */
  readonly totalPages?: number | undefined;

  /**
   * Есть ли ещё данные за пределами возвращённых элементов.
   *
   * Консервативная оценка: `true`, если сервер прислал `Link rel="next"` И
   * sanity-эвристика (perPage-сравнение) не опровергла его для не-seek
   * курсорных ручек. `false` НЕ гарантирует отсутствие данных дальше — если
   * нужна уверенность, ориентируйтесь на `nextCursor` (см. его JSDoc).
   */
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
