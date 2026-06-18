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
   * Номер страницы (начинается с 1)
   *
   * По умолчанию: 1
   */
  readonly page?: number | undefined;
}

/**
 * Метаданные пагинации, прикладываемые к результату list-операций.
 *
 * Единый тип и для single-page (одна страница + признаки наличия ещё данных),
 * и для fetchAll (полный обход). Режимы различаются по флагам
 * `fetchedAll`/`truncated`/`hasError`.
 *
 * `total`/`totalPages` заполняются только когда сервер прислал заголовки
 * `X-Total-Count`/`X-Total-Pages` (seek-механизм `_search`); для чистого
 * Link-cursor их может не быть — тогда ориентир `hasNextPage`.
 */
export interface PaginationMeta {
  /** Номер текущей страницы (если применимо к запросу) */
  readonly page?: number | undefined;

  /** Размер страницы (если применимо к запросу) */
  readonly perPage?: number | undefined;

  /** Общее количество элементов (только при `X-Total-Count`) */
  readonly total?: number | undefined;

  /** Общее количество страниц (только при `X-Total-Pages`) */
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
