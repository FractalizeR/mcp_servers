/**
 * Операция получения списка проектов в Яндекс.Трекере
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение списка проектов
 * - Поддержка пагинации (single-page + opt-in fetchAll) и фильтрации
 * - Поддержка expand параметров
 * - НЕТ создания/обновления/удаления
 *
 * API: GET /v2/projects
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { TrackerPaginator, DEFAULT_MAX_PER_PAGE } from '#tracker_api/utils/index.js';
import type { GetProjectsDto } from '#tracker_api/dto/index.js';
import type { ProjectWithUnknownFields } from '#tracker_api/entities/index.js';
import type { PaginatedResult } from '#tracker_api/entities/index.js';

export class GetProjectsOperation extends BaseOperation {
  /**
   * Получает список проектов с поддержкой пагинации и фильтрации
   *
   * @param params - параметры запроса (page, perPage, expand, queueId, fetchAll, maxItems)
   * @returns страница проектов с метаданными пагинации
   *
   * ВАЖНО:
   * - Retry делается ТОЛЬКО в HttpClient (нет двойного retry)
   * - expand позволяет получить дополнительные поля
   * - queueId фильтрует проекты по очереди
   * - `total` теперь берётся из заголовка `X-Total-Count` (если API его шлёт),
   *   а не подделывается длиной возвращённой страницы
   */
  async execute(params: GetProjectsDto = {}): Promise<PaginatedResult<ProjectWithUnknownFields>> {
    const { page, expand, queueId, fetchAll, maxItems } = params;

    this.logger.info('Получение списка проектов');

    // В режиме fetchAll поднимаем размер страницы к рекомендованному максимуму
    // ради меньшего числа round-trip'ов (maxItems всё равно режет финальную выдачу).
    const effectivePerPage =
      fetchAll === true ? (params.perPage ?? DEFAULT_MAX_PER_PAGE) : params.perPage;

    const endpoint = this.buildEndpoint({ page, perPage: effectivePerPage, expand, queueId });

    const first = await this.httpClient.getWithResponse<ProjectWithUnknownFields[]>(endpoint);

    if (fetchAll === true) {
      return TrackerPaginator.fetchAllPages<ProjectWithUnknownFields>({
        firstResponse: first,
        requestNext: (path) => this.httpClient.getWithResponse<ProjectWithUnknownFields[]>(path),
        ...(maxItems !== undefined ? { maxItems } : {}),
        ...(page !== undefined ? { page } : {}),
        ...(effectivePerPage !== undefined ? { perPage: effectivePerPage } : {}),
        onError: (error, pagesFetched) => {
          this.logger.warn('Частичный отказ при обходе страниц проектов', {
            pagesFetched,
            error: error instanceof Error ? error.message : String(error),
          });
        },
      });
    }

    return TrackerPaginator.singlePage<ProjectWithUnknownFields>(first, {
      page,
      perPage: params.perPage,
    });
  }

  /**
   * Строит endpoint с query-параметрами.
   */
  private buildEndpoint(opts: {
    readonly page?: number | undefined;
    readonly perPage?: number | undefined;
    readonly expand?: string | undefined;
    readonly queueId?: string | undefined;
  }): string {
    const queryParams = new URLSearchParams();
    if (opts.page !== undefined) queryParams.append('page', opts.page.toString());
    if (opts.perPage !== undefined) queryParams.append('perPage', opts.perPage.toString());
    if (opts.expand) queryParams.append('expand', opts.expand);
    if (opts.queueId) queryParams.append('queueId', opts.queueId);

    const queryString = queryParams.toString();
    return `/v2/projects${queryString ? `?${queryString}` : ''}`;
  }
}
