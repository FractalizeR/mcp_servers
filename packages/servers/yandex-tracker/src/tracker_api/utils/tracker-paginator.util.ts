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
import { CursorCodec } from './cursor-codec.util.js';
import type { CursorTag } from './cursor-codec.util.js';
import type { ItemBudget } from './item-budget.util.js';
import { stripTrackerHost } from './strip-host.util.js';

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
  /**
   * @deprecated Номер текущей страницы — только для легаси-режима (без `tag`).
   * Удаляется в этапе 3.1 вместе с публичным `page`.
   */
  readonly page?: number | undefined;
  /** Размер страницы (если применимо к запросу). */
  readonly perPage?: number | undefined;
  /**
   * Тег семейства эндпоинта. Его наличие ВКЛЮЧАЕТ cursor-режим (R5/R6):
   * - `nextCursor` кодируется из `Link rel="next"`;
   * - `total`/`totalPages` отдаются ТОЛЬКО при `rel="seek"` (seek-gating);
   * - эвристика `page*perPage < total` и поле `page` НЕ применяются.
   *
   * Без `tag` сохраняется легаси-поведение (для немигрированных эндпоинтов до 2.x).
   */
  readonly tag?: CursorTag | undefined;
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
  /** Размер страницы — прокидывается в метаданные. */
  readonly perPage?: number;
  /**
   * Общий бюджет записей на весь batch-ответ (необязателен).
   *
   * Если задан — цепочка берёт не больше `min(maxItems, budget.remaining)`
   * записей и атомарно списывает собранное. По исчерпании бюджета цепочка
   * останавливается с `truncated=true`.
   */
  readonly budget?: ItemBudget;
  /**
   * Тег семейства эндпоинта — включает cursor-режим (см. {@link BuildMetaInput.tag}).
   * Без него финальная meta строится в легаси-режиме (без `nextCursor`).
   */
  readonly tag?: CursorTag;
  /** Колбэк для логирования частичного отказа (warning). */
  readonly onError?: (error: unknown, pagesFetched: number) => void;
}

/**
 * Доменный паджинатор Яндекс.Трекера.
 */
export class TrackerPaginator {
  /**
   * Превратить next-URL в относительный путь + query (delegate к {@link stripTrackerHost}).
   *
   * Сохранён как публичный статический метод для обратной совместимости с
   * существующими вызовами/тестами; логика — в общем модуле `strip-host.util`,
   * чтобы её разделяли паджинатор и `CursorCodec` без циклической зависимости.
   *
   * @param url - абсолютный или относительный next-URL
   * @returns путь+query или `undefined`, если путь не похож на API Трекера
   */
  public static stripHost(url: string): string | undefined {
    return stripTrackerHost(url);
  }

  /**
   * Собрать `PaginationMeta` из заголовков и состояния обхода.
   *
   * Режим выбирается по `input.tag`:
   * - есть `tag` → cursor-режим (`nextCursor` + seek-gating, R5/R6);
   * - нет `tag` → легаси-режим (X-Total без seek-gating, поле `page`) для
   *   немигрированных эндпоинтов; удаляется в этапе 3.1.
   */
  public static buildMeta(input: BuildMetaInput): PaginationMeta {
    return input.tag !== undefined
      ? TrackerPaginator.buildCursorMeta(input, input.tag)
      : TrackerPaginator.buildLegacyMeta(input);
  }

  /**
   * Cursor-режим: `nextCursor` из `Link rel="next"`, `total`/`totalPages` только
   * при `rel="seek"`. Без эвристики `page*perPage < total` и без поля `page`.
   */
  private static buildCursorMeta(input: BuildMetaInput, tag: CursorTag): PaginationMeta {
    const path = input.nextUrl !== undefined ? stripTrackerHost(input.nextUrl) : undefined;
    const hasNextPage = Boolean(path) || input.truncated;
    const fetchedAll = !hasNextPage && !input.hasError;

    const hasSeek = parseLinkHeader(input.headers['link'])['seek'] !== undefined;
    const total = hasSeek
      ? TrackerPaginator.parseIntHeader(input.headers['x-total-count'])
      : undefined;
    const totalPages = hasSeek
      ? TrackerPaginator.parseIntHeader(input.headers['x-total-pages'])
      : undefined;

    const nextCursor = path !== undefined ? CursorCodec.encode(path, tag) : undefined;

    return {
      hasNextPage,
      fetchedAll,
      truncated: input.truncated,
      hasError: input.hasError,
      pagesFetched: input.pagesFetched,
      ...(input.perPage !== undefined ? { perPage: input.perPage } : {}),
      ...(total !== undefined ? { total } : {}),
      ...(totalPages !== undefined ? { totalPages } : {}),
      ...(nextCursor !== undefined ? { nextCursor } : {}),
    };
  }

  /**
   * @deprecated Легаси-режим (без `tag`): X-Total без seek-gating, поле `page`,
   * эвристика `page*perPage < total`. Удаляется в этапе 3.1 после миграции всех
   * эндпоинтов на cursor.
   */
  private static buildLegacyMeta(input: BuildMetaInput): PaginationMeta {
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
   * Cursor-режим включается передачей `opts.tag`: тогда meta получает `nextCursor`
   * и seek-gating (`total`/`totalPages` только при `rel="seek"`). Без `tag` —
   * легаси-поведение (поле `page`), пока эндпоинт не мигрирован (этап 2.x).
   *
   * @param response - конверт ответа (data + заголовки)
   * @param opts - размер страницы / тег эндпоинта для проброса в метаданные
   */
  public static singlePage<T>(
    response: HttpResponseEnvelope<T[]>,
    opts: {
      readonly page?: number | undefined;
      readonly perPage?: number | undefined;
      readonly tag?: CursorTag | undefined;
    } = {}
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
      ...(opts.tag !== undefined ? { tag: opts.tag } : {}),
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
    const budget = opts.budget;

    const items: T[] = [];
    let droppedByLimit = false;

    // Принять записи страницы с учётом per-chain `maxItems` и общего `budget`.
    // Списание из бюджета синхронно (между чтением и consume нет await),
    // поэтому параллельные цепочки суммарно не превышают общий потолок.
    const accept = (data: T[]): void => {
      const chainRoom = maxItems - items.length;
      const budgetRoom = budget !== undefined ? budget.remaining : Number.POSITIVE_INFINITY;
      const room = Math.max(0, Math.min(chainRoom, budgetRoom));
      const take = Math.min(data.length, room);
      if (take > 0) {
        items.push(...data.slice(0, take));
        budget?.consume(take);
      }
      if (take < data.length) {
        droppedByLimit = true;
      }
    };

    accept(opts.firstResponse.data);
    let pagesFetched = 1;
    let headers = opts.firstResponse.headers;
    let next = TrackerPaginator.nextUrl(headers);
    let hasError = false;

    const limitReached = (): boolean =>
      items.length >= maxItems || (budget !== undefined && budget.remaining <= 0);

    while (next !== undefined && !limitReached() && pagesFetched < maxPages) {
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

      accept(response.data);
      pagesFetched += 1;
      headers = response.headers;
      next = TrackerPaginator.nextUrl(headers);
    }

    // truncated, если остались данные (next) или мы отбросили часть страницы
    // по защитному лимиту (maxItems/budget).
    const truncated = next !== undefined || droppedByLimit;

    // ВАЖНО: стартовый `page` НЕ прокидываем в метаданные. После полного обхода
    // эвристика `page*perPage < total` со стартовой страницей дала бы ложный
    // hasNextPage=true; наличие следующих данных отражают `nextUrl`/`truncated`.
    const meta = TrackerPaginator.buildMeta({
      headers,
      pagesFetched,
      truncated,
      hasError,
      nextUrl: next,
      ...(opts.perPage !== undefined ? { perPage: opts.perPage } : {}),
      ...(opts.tag !== undefined ? { tag: opts.tag } : {}),
    });

    return { items, pagination: meta };
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
