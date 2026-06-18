/**
 * TrackerPaginator — доменная логика пагинации Яндекс.Трекера.
 *
 * Ответственность (SRP):
 * - проход по страницам через `Link rel="next"` (cursor) с защитными лимитами;
 * - нормализация next-URL в относительный путь (`stripHost`, аналог Python `_strip_host`);
 * - сборка `PaginationMeta` из заголовков ответа (`X-Total-Count`/`X-Total-Pages`).
 *
 * Generic-примитивы (`parseLinkHeader`, нормализация заголовков) живут во
 * фреймворке `@fractalizer/mcp-infrastructure`; здесь — только доменная политика
 * Трекера (seek/X-Total, maxItems/maxPages, частичный отказ).
 *
 * Ссылки: `yandex_tracker_client/connection.py`, `objects.py:268-330`.
 */

import { parseLinkHeader } from '@fractalizer/mcp-infrastructure';
import type { HttpResponseEnvelope, ResponseHeaders } from '@fractalizer/mcp-infrastructure';

import type { PaginatedResult, PaginationMeta } from '../entities/common/index.js';

/** Защитный лимит по записям (прокси токенов агента). */
export const DEFAULT_MAX_ITEMS = 500;

/** Вторичный backstop по числу страниц (защита от рантэвея). */
export const DEFAULT_MAX_PAGES = 100;

/**
 * Рекомендуемый максимум `perPage` для режима fetchAll.
 *
 * Операции поднимают `perPage` к этому значению ради меньшего числа
 * round-trip'ов; `maxItems` всё равно режет финальную выдачу.
 */
export const DEFAULT_MAX_PER_PAGE = 100;

/**
 * Входные данные для сборки `PaginationMeta`.
 */
export interface BuildMetaInput {
  /** Нормализованные заголовки финального ответа (lowercase-ключи). */
  readonly headers: ResponseHeaders;
  /** Сколько страниц фактически загружено. */
  readonly pagesFetched: number;
  /** Выдача обрезана защитным лимитом. */
  readonly truncated: boolean;
  /** Был частичный отказ при обходе. */
  readonly hasError: boolean;
  /** URL следующей страницы, если ещё есть данные. */
  readonly nextUrl?: string | undefined;
  /** Номер текущей страницы (если применимо к запросу). */
  readonly page?: number | undefined;
  /** Размер страницы (если применимо к запросу). */
  readonly perPage?: number | undefined;
}

/**
 * Опции полного обхода `fetchAllPages`.
 */
export interface FetchAllPagesOptions<T> {
  /** Уже полученная первая страница (data + заголовки). */
  readonly firstResponse: HttpResponseEnvelope<T[]>;
  /**
   * Как запросить следующую страницу по относительному пути.
   *
   * Для GET — `getWithResponse(path)`; для POST `_search` — `postWithResponse`
   * с тем же телом (иначе next вернёт не то).
   */
  readonly requestNext: (path: string) => Promise<HttpResponseEnvelope<T[]>>;
  /** Лимит по записям (дефолт `DEFAULT_MAX_ITEMS`). */
  readonly maxItems?: number;
  /** Лимит по страницам (дефолт `DEFAULT_MAX_PAGES`). */
  readonly maxPages?: number;
  /** Номер стартовой страницы — прокидывается в метаданные. */
  readonly page?: number;
  /** Размер страницы — прокидывается в метаданные. */
  readonly perPage?: number;
  /** Колбэк для логирования частичного отказа (warning). */
  readonly onError?: (error: unknown, pagesFetched: number) => void;
}

/**
 * Доменный паджинатор Яндекс.Трекера.
 */
export class TrackerPaginator {
  /**
   * Превратить next-URL в относительный путь + query.
   *
   * Defense-in-depth: путь обязан начинаться с `/v2/` или `/v3/`, иначе
   * считаем next невалидным (возвращаем `undefined` — обход останавливается).
   *
   * @param url - абсолютный или относительный next-URL
   * @returns путь+query или `undefined`, если путь не похож на API Трекера
   */
  public static stripHost(url: string): string | undefined {
    const withoutScheme = url.replace(/^https?:\/\/[^/]+/i, '');
    const pathQuery = withoutScheme.length > 0 ? withoutScheme : url;

    if (!/^\/v[23]\//.test(pathQuery)) {
      return undefined;
    }

    return pathQuery;
  }

  /**
   * Собрать `PaginationMeta` из заголовков и состояния обхода.
   */
  public static buildMeta(input: BuildMetaInput): PaginationMeta {
    const total = TrackerPaginator.parseIntHeader(input.headers['x-total-count']);
    const totalPages = TrackerPaginator.parseIntHeader(input.headers['x-total-pages']);

    const hasMoreByTotal =
      total !== undefined && input.page !== undefined && input.perPage !== undefined
        ? input.page * input.perPage < total
        : false;

    const hasNextPage = Boolean(input.nextUrl) || input.truncated || hasMoreByTotal;
    const fetchedAll = !hasNextPage && !input.hasError;

    return {
      hasNextPage,
      fetchedAll,
      truncated: input.truncated,
      hasError: input.hasError,
      pagesFetched: input.pagesFetched,
      ...(input.page !== undefined ? { page: input.page } : {}),
      ...(input.perPage !== undefined ? { perPage: input.perPage } : {}),
      ...(total !== undefined ? { total } : {}),
      ...(totalPages !== undefined ? { totalPages } : {}),
    };
  }

  /**
   * Обернуть одну (первую) страницу в `PaginatedResult` с метаданными.
   *
   * Режим по умолчанию (без `fetchAll`): один запрос, `hasNextPage`
   * вычисляется из заголовков `Link`/`X-Total-*`. Агент листает вручную
   * через `page`.
   *
   * @param response - конверт ответа (data + заголовки)
   * @param opts - номер/размер страницы для проброса в метаданные
   */
  public static singlePage<T>(
    response: HttpResponseEnvelope<T[]>,
    opts: { readonly page?: number | undefined; readonly perPage?: number | undefined } = {}
  ): PaginatedResult<T> {
    const next = TrackerPaginator.nextUrl(response.headers);

    const meta = TrackerPaginator.buildMeta({
      headers: response.headers,
      pagesFetched: 1,
      truncated: false,
      hasError: false,
      nextUrl: next,
      ...(opts.page !== undefined ? { page: opts.page } : {}),
      ...(opts.perPage !== undefined ? { perPage: opts.perPage } : {}),
    });

    return { items: [...response.data], pagination: meta };
  }

  /**
   * Полный обход по `Link rel="next"` до исчерпания или защитного лимита.
   *
   * Страницы строго последовательны (next известен только из предыдущего
   * ответа). При ошибке после страниц 1..N-1 возвращается частичный результат
   * с `hasError=true`, собранное не теряется.
   */
  public static async fetchAllPages<T>(opts: FetchAllPagesOptions<T>): Promise<PaginatedResult<T>> {
    const maxItems = opts.maxItems ?? DEFAULT_MAX_ITEMS;
    const maxPages = opts.maxPages ?? DEFAULT_MAX_PAGES;

    const items: T[] = [...opts.firstResponse.data];
    let pagesFetched = 1;
    let headers = opts.firstResponse.headers;
    let next = TrackerPaginator.nextUrl(headers);
    let hasError = false;

    while (next !== undefined && items.length < maxItems && pagesFetched < maxPages) {
      const path = TrackerPaginator.stripHost(next);
      if (path === undefined) {
        next = undefined;
        break;
      }

      let response: HttpResponseEnvelope<T[]>;
      try {
        response = await opts.requestNext(path);
      } catch (error) {
        hasError = true;
        opts.onError?.(error, pagesFetched);
        break;
      }

      items.push(...response.data);
      pagesFetched += 1;
      headers = response.headers;
      next = TrackerPaginator.nextUrl(headers);
    }

    // Ещё есть next, но мы остановились по maxItems/maxPages.
    let truncated = next !== undefined;
    let finalItems = items;
    if (items.length > maxItems) {
      finalItems = items.slice(0, maxItems);
      truncated = true;
    }

    const meta = TrackerPaginator.buildMeta({
      headers,
      pagesFetched,
      truncated,
      hasError,
      nextUrl: next,
      ...(opts.page !== undefined ? { page: opts.page } : {}),
      ...(opts.perPage !== undefined ? { perPage: opts.perPage } : {}),
    });

    return { items: finalItems, pagination: meta };
  }

  /**
   * Извлечь URL следующей страницы из заголовка `Link`.
   */
  private static nextUrl(headers: ResponseHeaders): string | undefined {
    return parseLinkHeader(headers['link'])['next'];
  }

  /**
   * Распарсить числовой заголовок; `undefined`, если заголовка нет или это не число.
   */
  private static parseIntHeader(value: string | undefined): number | undefined {
    if (value === undefined) {
      return undefined;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
}
