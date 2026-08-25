/**
 * Операция получения списка проектов в Яндекс.Трекере
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение списка проектов
 * - Курсорная пагинация (single-page + opt-in fetchAll) и фильтрация
 * - Поддержка expand параметров
 * - НЕТ создания/обновления/удаления
 *
 * API: GET /v3/projects (seekable: Link rel="seek" → total из X-Total-Count)
 *
 * ВНИМАНИЕ: `Link` в ответах этой ручки указывает на чужую коллекцию — см.
 * `pin-projects-link.util.ts`; каждый конверт прогоняется через починку
 * ДО пагинатора, иначе листание уводит на чужую коллекцию.
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import {
  TrackerPaginator,
  DEFAULT_MAX_PER_PAGE,
  CursorCodec,
  CURSOR_TAGS,
  InvalidCursorError,
} from '#tracker_api/utils/index.js';
import {
  pinProjectsLinkHeader,
  isProjectsPath,
} from '#tracker_api/api_operations/project/pin-projects-link.util.js';
import type { GetProjectsDto } from '#tracker_api/dto/index.js';
import type { ProjectWithUnknownFields } from '#tracker_api/entities/index.js';
import type { PaginatedResult } from '#tracker_api/entities/index.js';
import type { HttpResponseEnvelope } from '@fractalizer/mcp-infrastructure';

export class GetProjectsOperation extends BaseOperation {
  /** Запросить страницу проектов, вернув конверт с починенным `Link`. */
  private async requestPage(
    path: string
  ): Promise<HttpResponseEnvelope<ProjectWithUnknownFields[]>> {
    const response = await this.httpClient.getWithResponse<ProjectWithUnknownFields[]>(path);
    return { data: response.data, headers: pinProjectsLinkHeader(response.headers, path) };
  }

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
      if (!isProjectsPath(path)) {
        throw new InvalidCursorError(
          'Курсор адресует не коллекцию проектов на текущей версии API. Наиболее вероятная ' +
            'причина — курсор выдан до миграции на /v3/projects (ещё адресует /v2/projects); ' +
            'также курсор мог быть выдан версией сервера, доверявшей чужому заголовку Link. ' +
            'Запросите первую страницу заново.'
        );
      }
      this.logger.info('Получение списка проектов (cursor)');
      const response = await this.requestPage(path);
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

    const first = await this.requestPage(endpoint);

    if (fetchAll === true) {
      return TrackerPaginator.fetchAllPages<ProjectWithUnknownFields>({
        firstResponse: first,
        requestNext: (path) => this.requestPage(path),
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
    return `/v3/projects${queryString ? `?${queryString}` : ''}`;
  }
}
