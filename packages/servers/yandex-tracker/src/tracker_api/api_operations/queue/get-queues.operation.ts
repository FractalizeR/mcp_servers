/**
 * Операция получения списка очередей в Яндекс.Трекере
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение списка очередей с пагинацией (single-page + opt-in fetchAll)
 * - Курсорная пагинация (nextCursor) + seek-режим v3 (total/totalPages сохраняются)
 * - Поддержка expand параметров
 * - НЕТ создания/обновления/удаления
 *
 * API: GET /v3/queues/ (seekable: Link rel="seek" → total/totalPages доступны)
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import {
  TrackerPaginator,
  DEFAULT_MAX_PER_PAGE,
  CursorCodec,
  CURSOR_TAGS,
} from '#tracker_api/utils/index.js';
import type { GetQueuesDto } from '#tracker_api/dto/index.js';
import type { QueueWithUnknownFields } from '#tracker_api/entities/index.js';
import type { PaginatedResult } from '#tracker_api/entities/index.js';

export class GetQueuesOperation extends BaseOperation {
  /**
   * Получает список очередей с пагинацией
   *
   * @param params - параметры запроса (perPage, cursor, expand, fetchAll, maxItems)
   * @returns страница очередей с метаданными пагинации (`nextCursor`/`total`/...)
   *
   * ВАЖНО:
   * - `cursor` → один запрос по декодированному пути (perPage уже в нём);
   * - иначе single-page (по умолчанию) или полный обход (fetchAll);
   * - Retry делается ТОЛЬКО в HttpClient (нет двойного retry);
   * - очередь seekable (rel="seek") → total/totalPages сохраняются.
   */
  async execute(params: GetQueuesDto = {}): Promise<PaginatedResult<QueueWithUnknownFields>> {
    const { perPage = 50, cursor, expand, fetchAll, maxItems } = params;

    // Курсор: один запрос по декодированному пути (perPage зафиксирован в нём).
    if (cursor !== undefined) {
      const { path } = CursorCodec.decode(cursor, CURSOR_TAGS.queues);
      this.logger.info('Получение списка очередей (cursor)');
      const response = await this.httpClient.getWithResponse<QueueWithUnknownFields[]>(path);
      return TrackerPaginator.singlePage<QueueWithUnknownFields>(response, {
        tag: CURSOR_TAGS.queues,
      });
    }

    this.logger.info(`Получение списка очередей (perPage=${perPage})`);

    // В режиме fetchAll поднимаем размер страницы к рекомендованному максимуму.
    const effectivePerPage = fetchAll === true ? DEFAULT_MAX_PER_PAGE : perPage;

    const endpoint = this.buildEndpoint({ perPage: effectivePerPage, expand });

    const first = await this.httpClient.getWithResponse<QueueWithUnknownFields[]>(endpoint);

    if (fetchAll === true) {
      return TrackerPaginator.fetchAllPages<QueueWithUnknownFields>({
        firstResponse: first,
        requestNext: (path) => this.httpClient.getWithResponse<QueueWithUnknownFields[]>(path),
        tag: CURSOR_TAGS.queues,
        ...(maxItems !== undefined ? { maxItems } : {}),
        perPage: effectivePerPage,
        onError: (error, pagesFetched) => {
          this.logger.warn('Частичный отказ при обходе страниц очередей', {
            pagesFetched,
            error: error instanceof Error ? error.message : String(error),
          });
        },
      });
    }

    return TrackerPaginator.singlePage<QueueWithUnknownFields>(first, {
      perPage,
      tag: CURSOR_TAGS.queues,
    });
  }

  /**
   * Строит endpoint первой страницы с query-параметрами (без page).
   */
  private buildEndpoint(opts: {
    readonly perPage?: number | undefined;
    readonly expand?: string | undefined;
  }): string {
    const queryParams = new URLSearchParams();
    if (opts.perPage !== undefined) queryParams.append('perPage', opts.perPage.toString());
    if (opts.expand) queryParams.append('expand', opts.expand);

    const queryString = queryParams.toString();
    return queryString ? `/v3/queues?${queryString}` : '/v3/queues';
  }
}
