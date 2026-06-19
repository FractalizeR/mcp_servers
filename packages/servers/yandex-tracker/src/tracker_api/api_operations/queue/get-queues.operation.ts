/**
 * Операция получения списка очередей в Яндекс.Трекере
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение списка очередей с пагинацией (single-page + opt-in fetchAll)
 * - Поддержка expand параметров
 * - НЕТ создания/обновления/удаления
 *
 * API: GET /v3/queues/
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { TrackerPaginator, DEFAULT_MAX_PER_PAGE } from '#tracker_api/utils/index.js';
import type { GetQueuesDto } from '#tracker_api/dto/index.js';
import type { QueueWithUnknownFields } from '#tracker_api/entities/index.js';
import type { PaginatedResult } from '#tracker_api/entities/index.js';

export class GetQueuesOperation extends BaseOperation {
  /**
   * Получает список очередей с пагинацией
   *
   * @param params - параметры запроса (perPage, page, expand, fetchAll, maxItems)
   * @returns страница очередей с метаданными пагинации
   *
   * ВАЖНО:
   * - Поддерживает single-page (по умолчанию) и полный обход (fetchAll)
   * - Retry делается ТОЛЬКО в HttpClient (нет двойного retry)
   * - expand позволяет получить дополнительные поля
   */
  async execute(params: GetQueuesDto = {}): Promise<PaginatedResult<QueueWithUnknownFields>> {
    const { perPage = 50, page = 1, expand, fetchAll, maxItems } = params;

    this.logger.info(`Получение списка очередей (page=${page}, perPage=${perPage})`);

    // В режиме fetchAll поднимаем размер страницы к рекомендованному максимуму.
    const effectivePerPage = fetchAll === true ? DEFAULT_MAX_PER_PAGE : perPage;

    const endpoint = this.buildEndpoint({ page, perPage: effectivePerPage, expand });

    const first = await this.httpClient.getWithResponse<QueueWithUnknownFields[]>(endpoint);

    if (fetchAll === true) {
      return TrackerPaginator.fetchAllPages<QueueWithUnknownFields>({
        firstResponse: first,
        requestNext: (path) => this.httpClient.getWithResponse<QueueWithUnknownFields[]>(path),
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

    return TrackerPaginator.singlePage<QueueWithUnknownFields>(first, { page, perPage });
  }

  /**
   * Строит endpoint с query-параметрами.
   */
  private buildEndpoint(opts: {
    readonly page?: number | undefined;
    readonly perPage?: number | undefined;
    readonly expand?: string | undefined;
  }): string {
    const queryParams = new URLSearchParams();
    if (opts.perPage !== undefined) queryParams.append('perPage', opts.perPage.toString());
    if (opts.page !== undefined) queryParams.append('page', opts.page.toString());
    if (opts.expand) queryParams.append('expand', opts.expand);

    const queryString = queryParams.toString();
    return queryString ? `/v3/queues?${queryString}` : '/v3/queues';
  }
}
