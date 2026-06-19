/**
 * Операция получения списка проектов в Яндекс.Трекере
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение списка проектов
 * - Курсорная пагинация (single-page + opt-in fetchAll) и фильтрация
 * - Поддержка expand параметров
 * - НЕТ создания/обновления/удаления
 *
 * API: GET /v2/projects (seekable v2: Link rel="seek" → total из X-Total-Count)
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import {
  TrackerPaginator,
  DEFAULT_MAX_PER_PAGE,
  CursorCodec,
  CURSOR_TAGS,
} from '#tracker_api/utils/index.js';
import type { GetProjectsDto } from '#tracker_api/dto/index.js';
import type { ProjectWithUnknownFields } from '#tracker_api/entities/index.js';
import type { PaginatedResult } from '#tracker_api/entities/index.js';

export class GetProjectsOperation extends BaseOperation {
  /**
   * Получает список проектов с поддержкой курсорной пагинации и фильтрации
   *
   * @param params - параметры запроса (perPage, cursor, expand, queueId, fetchAll, maxItems)
   * @returns страница проектов с метаданными пагинации (`nextCursor`/`total`/...)
   *
   * ВАЖНО:
   * - `cursor` → один запрос по декодированному пути (perPage уже в нём);
   * - Retry делается ТОЛЬКО в HttpClient (нет двойного retry);
   * - expand позволяет получить дополнительные поля;
   * - queueId фильтрует проекты по очереди;
   * - проекты seekable (rel="seek") → `total` из `X-Total-Count` сохраняется.
   */
  async execute(params: GetProjectsDto = {}): Promise<PaginatedResult<ProjectWithUnknownFields>> {
    const { cursor, expand, queueId, fetchAll, maxItems } = params;

    // Курсор: один запрос по декодированному пути (perPage зафиксирован в нём).
    if (cursor !== undefined) {
      const { path } = CursorCodec.decode(cursor, CURSOR_TAGS.projects);
      this.logger.info('Получение списка проектов (cursor)');
      const response = await this.httpClient.getWithResponse<ProjectWithUnknownFields[]>(path);
      return TrackerPaginator.singlePage<ProjectWithUnknownFields>(response, {
        tag: CURSOR_TAGS.projects,
      });
    }

    this.logger.info('Получение списка проектов');

    // В режиме fetchAll поднимаем размер страницы к рекомендованному максимуму
    // ради меньшего числа round-trip'ов (maxItems всё равно режет финальную выдачу).
    const effectivePerPage =
      fetchAll === true ? (params.perPage ?? DEFAULT_MAX_PER_PAGE) : params.perPage;

    const endpoint = this.buildEndpoint({ perPage: effectivePerPage, expand, queueId });

    const first = await this.httpClient.getWithResponse<ProjectWithUnknownFields[]>(endpoint);

    if (fetchAll === true) {
      return TrackerPaginator.fetchAllPages<ProjectWithUnknownFields>({
        firstResponse: first,
        requestNext: (path) => this.httpClient.getWithResponse<ProjectWithUnknownFields[]>(path),
        tag: CURSOR_TAGS.projects,
        ...(maxItems !== undefined ? { maxItems } : {}),
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
      perPage: params.perPage,
      tag: CURSOR_TAGS.projects,
    });
  }

  /**
   * Строит endpoint первой страницы с query-параметрами (без page).
   */
  private buildEndpoint(opts: {
    readonly perPage?: number | undefined;
    readonly expand?: string | undefined;
    readonly queueId?: string | undefined;
  }): string {
    const queryParams = new URLSearchParams();
    if (opts.perPage !== undefined) queryParams.append('perPage', opts.perPage.toString());
    if (opts.expand) queryParams.append('expand', opts.expand);
    if (opts.queueId) queryParams.append('queueId', opts.queueId);

    const queryString = queryParams.toString();
    return `/v2/projects${queryString ? `?${queryString}` : ''}`;
  }
}
