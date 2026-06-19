/**
 * Операция поиска задач через API v3 /issues/_search
 *
 * Ответственность (SRP):
 * - ТОЛЬКО поиск задач по query/filter/keys/queue
 * - Отправка POST запроса на /v3/issues/_search
 * - Пагинация результатов (seek по `Link rel="next"` либо перебор `page`)
 * - НЕТ batch-режима (это единичный POST запрос)
 * - НЕТ кеширования (результаты поиска динамичны)
 *
 * API Endpoint: POST /v3/issues/_search
 * Документация: https://yandex.ru/support/tracker/ru/concepts/issues/search-issues
 *
 * Пагинация (DP-5, двойная стратегия):
 * 1. Если ответ содержит `Link rel="next"` — обход через `postWithResponse`
 *    с ТЕМ ЖЕ телом (cursor-режим, наиболее надёжный для `_search`).
 * 2. Иначе, если есть заголовок `X-Total-Pages` > 1 — перебор страниц
 *    `page=1..N` (передаётся в query, как и в single-режиме).
 * 3. Если нет ни `Link`, ни `X-Total-Pages > 1` — одна страница.
 *
 * Ограничение: для выборок >10000 задач Трекер требует scroll-механизм
 * (поле `scrollType`/`scrollId`). В v1 он НЕ реализован: при `maxItems` ≤ 500
 * (потолок схемы 1000) лимит scroll недостижим, поэтому ограничение безопасно.
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import {
  TrackerPaginator,
  DEFAULT_MAX_PER_PAGE,
  DEFAULT_MAX_PAGES,
} from '#tracker_api/utils/index.js';
import type { FindIssuesInputDto } from '#tracker_api/dto/index.js';
import type { IssueWithUnknownFields } from '#tracker_api/entities/index.js';
import type { PaginatedResult } from '#tracker_api/entities/common/index.js';
import { parseLinkHeader } from '@fractalizer/mcp-infrastructure';
import type { HttpResponseEnvelope } from '@fractalizer/mcp-infrastructure';

/**
 * Результат поиска задач — страница задач + метаданные пагинации.
 *
 * ВАЖНО: инструмент собирает выдачу из `items`/`pagination` (см. find-issues.tool.ts).
 */
export type FindIssuesResult = PaginatedResult<IssueWithUnknownFields>;

export class FindIssuesOperation extends BaseOperation {
  /**
   * Ищет задачи по заданным критериям с поддержкой пагинации.
   *
   * @param params - параметры поиска (query/filter/keys/queue) + пагинация
   * @returns страница задач + метаданные пагинации
   * @throws {Error} при ошибках HTTP или если не указан ни один способ поиска
   *
   * ВАЖНО:
   * - Поддерживается 5 способов поиска (взаимоисключающие): query, filter, keys, queue, filterId
   * - Retry делается автоматически через HttpClient.postWithResponse
   * - Кеширование НЕ используется (результаты динамичны)
   * - При fetchAll=true обход начинается с первой страницы (см. DP-5 выше)
   */
  async execute(params: FindIssuesInputDto): Promise<FindIssuesResult> {
    this.validateSearchMethod(params);

    this.logger.info('Поиск задач:', {
      hasQuery: !!params.query,
      hasFilter: !!params.filter,
      keysCount: params.keys?.length ?? 0,
      hasQueue: !!params.queue,
      hasFilterId: !!params.filterId,
      perPage: params.perPage,
      page: params.page,
      fetchAll: params.fetchAll === true,
    });

    const requestBody = this.buildRequestBody(params);

    // В режиме fetchAll поднимаем perPage к рекомендуемому максимуму (меньше round-trip'ов).
    const effectivePerPage =
      params.fetchAll === true ? (params.perPage ?? DEFAULT_MAX_PER_PAGE) : params.perPage;

    const endpoint = this.buildEndpoint({
      ...(effectivePerPage !== undefined ? { perPage: effectivePerPage } : {}),
      ...(params.page !== undefined ? { page: params.page } : {}),
      ...(params.expand !== undefined ? { expand: params.expand } : {}),
    });

    const first = await this.httpClient.postWithResponse<IssueWithUnknownFields[]>(
      endpoint,
      requestBody
    );

    if (params.fetchAll !== true) {
      const single = TrackerPaginator.singlePage(first, {
        ...(params.page !== undefined ? { page: params.page } : {}),
        ...(effectivePerPage !== undefined ? { perPage: effectivePerPage } : {}),
      });
      this.logger.info(`Найдено задач (страница): ${single.items.length}`);
      return single;
    }

    return this.fetchAll(first, params, requestBody, effectivePerPage);
  }

  /**
   * Полный обход страниц поиска (DP-5).
   *
   * Сначала пробуем cursor-обход по `Link rel="next"`. Если первый ответ
   * не содержит `Link`, но прислал `X-Total-Pages` > 1 — перебираем `page`.
   */
  private async fetchAll(
    first: HttpResponseEnvelope<IssueWithUnknownFields[]>,
    params: FindIssuesInputDto,
    requestBody: Record<string, unknown>,
    perPage: number | undefined
  ): Promise<FindIssuesResult> {
    // Проверяем именно `rel="next"`, а не наличие любого `Link`: при `rel="seek"`
    // без `next` cursor-обход вернул бы одну страницу, минуя fallback по X-Total-Pages.
    const hasNext = parseLinkHeader(first.headers['link'])['next'] !== undefined;

    if (hasNext) {
      // Cursor-режим: next известен из заголовка; тело сохраняем тем же.
      return TrackerPaginator.fetchAllPages({
        firstResponse: first,
        requestNext: (path) =>
          this.httpClient.postWithResponse<IssueWithUnknownFields[]>(path, requestBody),
        ...(params.maxItems !== undefined ? { maxItems: params.maxItems } : {}),
        ...(perPage !== undefined ? { perPage } : {}),
        onError: (error, pagesFetched) =>
          this.logger.warn('Частичный отказ при обходе страниц поиска', { error, pagesFetched }),
      });
    }

    const totalPages = this.parseTotalPages(first.headers['x-total-pages']);
    if (totalPages !== undefined && totalPages > 1) {
      return this.fetchByPageNumbers(first, totalPages, requestBody, perPage, params.maxItems, {
        ...(params.expand !== undefined ? { expand: params.expand } : {}),
      });
    }

    // Ни Link, ни X-Total-Pages > 1 — одна страница.
    return TrackerPaginator.singlePage(first, {
      page: 1,
      ...(perPage !== undefined ? { perPage } : {}),
    });
  }

  /**
   * Перебор страниц по номеру `page=2..totalPages` (когда сервер не прислал `Link`).
   *
   * Первая страница уже получена; добавляем последующие до исчерпания страниц
   * либо защитного лимита `maxItems`.
   */
  private async fetchByPageNumbers(
    first: HttpResponseEnvelope<IssueWithUnknownFields[]>,
    totalPages: number,
    requestBody: Record<string, unknown>,
    perPage: number | undefined,
    maxItems: number | undefined,
    opts: { expand?: string[] | undefined } = {},
    maxItemsDefault = 500
  ): Promise<FindIssuesResult> {
    const limit = maxItems ?? maxItemsDefault;
    // Backstop по числу страниц (как в TrackerPaginator.fetchAllPages): защита от
    // рантэвея при большом X-Total-Pages с маленьким perPage.
    const lastPage = Math.min(totalPages, DEFAULT_MAX_PAGES);
    const items: IssueWithUnknownFields[] = [...first.data];
    let pagesFetched = 1;
    let hasError = false;

    for (let page = 2; page <= lastPage && items.length < limit; page += 1) {
      const endpoint = this.buildEndpoint({
        page,
        ...(perPage !== undefined ? { perPage } : {}),
        ...(opts.expand !== undefined ? { expand: opts.expand } : {}),
      });

      try {
        const response = await this.httpClient.postWithResponse<IssueWithUnknownFields[]>(
          endpoint,
          requestBody
        );
        items.push(...response.data);
        pagesFetched += 1;
      } catch (error) {
        hasError = true;
        this.logger.warn('Частичный отказ при переборе страниц поиска', { error, page });
        break;
      }
    }

    const truncated = items.length > limit || (pagesFetched < totalPages && !hasError);
    const finalItems = items.length > limit ? items.slice(0, limit) : items;

    // ВАЖНО: page НЕ передаём в buildMeta. Здесь мы уже обошли страницы
    // 1..N, поэтому hasMoreByTotal (page*perPage < total) с page=1 дал бы
    // ложный hasNextPage=true при полном обходе. Наличие следующих данных
    // отражает только truncated (нет Link в page-режиме).
    const meta = TrackerPaginator.buildMeta({
      headers: first.headers,
      pagesFetched,
      truncated,
      hasError,
      ...(perPage !== undefined ? { perPage } : {}),
    });

    return { items: finalItems, pagination: meta };
  }

  /**
   * Валидация: хотя бы один способ поиска должен быть указан.
   */
  private validateSearchMethod(params: FindIssuesInputDto): void {
    const hasSearchMethod =
      params.query !== undefined ||
      params.filter !== undefined ||
      (params.keys !== undefined && params.keys.length > 0) ||
      params.queue !== undefined ||
      params.filterId !== undefined;

    if (!hasSearchMethod) {
      throw new Error(
        'FindIssuesOperation: не указан способ поиска (укажи query, filter, keys, queue или filterId)'
      );
    }
  }

  /**
   * Собрать тело POST-запроса (параметры поиска).
   */
  private buildRequestBody(params: FindIssuesInputDto): Record<string, unknown> {
    const requestBody: Record<string, unknown> = {};

    if (params.query !== undefined) {
      requestBody['query'] = params.query;
    }
    if (params.filter !== undefined) {
      requestBody['filter'] = params.filter;
    }
    if (params.keys !== undefined) {
      requestBody['keys'] = params.keys;
    }
    if (params.queue !== undefined) {
      requestBody['queue'] = params.queue;
    }
    if (params.filterId !== undefined) {
      requestBody['filterId'] = params.filterId;
    }
    if (params.order !== undefined) {
      requestBody['order'] = params.order;
    }

    return requestBody;
  }

  /**
   * Сформировать endpoint `/v3/issues/_search` с query-параметрами.
   */
  private buildEndpoint(opts: {
    perPage?: number | undefined;
    page?: number | undefined;
    expand?: string[] | undefined;
  }): string {
    const queryParams: Record<string, string> = {};
    if (opts.perPage !== undefined) {
      queryParams['perPage'] = String(opts.perPage);
    }
    if (opts.page !== undefined) {
      queryParams['page'] = String(opts.page);
    }
    if (opts.expand !== undefined && opts.expand.length > 0) {
      queryParams['expand'] = opts.expand.map(String).join(',');
    }

    const queryString =
      Object.keys(queryParams).length > 0
        ? `?${Object.entries(queryParams)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&')}`
        : '';

    return `/v3/issues/_search${queryString}`;
  }

  /**
   * Распарсить `X-Total-Pages`; `undefined`, если заголовка нет или это не число.
   */
  private parseTotalPages(value: string | undefined): number | undefined {
    if (value === undefined) {
      return undefined;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
}
