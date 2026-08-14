/**
 * Операция поиска записей времени по всей организации (org-wide worklog search)
 *
 * Ответственность (SRP):
 * - ТОЛЬКО поиск worklog по автору/диапазону дат, POST /v3/worklog/_search
 * - НЕТ per-issue выборки (см. GetWorklogsOperation)
 *
 * Заменяет паттерн "перебрать все задачи через find_issues, затем
 * get_worklogs на каждую" одним запросом с фильтром по автору/датам.
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { TrackerPaginator, CursorCodec, CURSOR_TAGS } from '#tracker_api/utils/index.js';
import type { SearchWorklogDto } from '#tracker_api/dto/index.js';
import type { WorklogWithUnknownFields } from '#tracker_api/entities/index.js';
import type { PaginatedResult } from '#tracker_api/entities/common/index.js';

export class SearchWorklogOperation extends BaseOperation {
  async execute(params: SearchWorklogDto): Promise<PaginatedResult<WorklogWithUnknownFields>> {
    if (params.cursor !== undefined) {
      return this.fetchByCursor(params);
    }

    this.logger.info('Поиск worklog по организации', {
      hasCreatedBy: !!params.createdBy,
      hasDateRange: !!(params.createdAtFrom ?? params.createdAtTo),
      fetchAll: params.fetchAll === true,
    });

    const body = this.buildRequestBody(params);
    const endpoint = this.buildEndpoint(params.perPage);

    // idempotencyDeclared: true — POST `_search` только читает.
    const first = await this.httpClient.postWithResponse<WorklogWithUnknownFields[]>(
      endpoint,
      body,
      undefined,
      true
    );

    if (params.fetchAll !== true) {
      return TrackerPaginator.singlePage(first, {
        tag: CURSOR_TAGS.worklogSearch,
        ...(params.perPage !== undefined ? { perPage: params.perPage } : {}),
      });
    }

    return TrackerPaginator.fetchAllPages({
      firstResponse: first,
      requestNext: (path) =>
        this.httpClient.postWithResponse<WorklogWithUnknownFields[]>(path, body, undefined, true),
      tag: CURSOR_TAGS.worklogSearch,
      ...(params.maxItems !== undefined ? { maxItems: params.maxItems } : {}),
      ...(params.perPage !== undefined ? { perPage: params.perPage } : {}),
      onError: (error, pagesFetched) =>
        this.logger.warn('Частичный отказ при обходе страниц поиска worklog', {
          error,
          pagesFetched,
        }),
    });
  }

  private async fetchByCursor(
    params: SearchWorklogDto
  ): Promise<PaginatedResult<WorklogWithUnknownFields>> {
    const { path } = CursorCodec.decode(params.cursor as string, CURSOR_TAGS.worklogSearch);
    const body = this.buildRequestBody(params);

    const resp = await this.httpClient.postWithResponse<WorklogWithUnknownFields[]>(
      path,
      body,
      undefined,
      true
    );

    return TrackerPaginator.singlePage(resp, { tag: CURSOR_TAGS.worklogSearch });
  }

  private buildRequestBody(params: SearchWorklogDto): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    if (params.createdBy !== undefined) {
      body['createdBy'] = params.createdBy;
    }
    if (params.createdAtFrom !== undefined || params.createdAtTo !== undefined) {
      body['createdAt'] = {
        ...(params.createdAtFrom !== undefined ? { from: params.createdAtFrom } : {}),
        ...(params.createdAtTo !== undefined ? { to: params.createdAtTo } : {}),
      };
    }
    return body;
  }

  private buildEndpoint(perPage: number | undefined): string {
    const query = perPage !== undefined ? `?perPage=${encodeURIComponent(String(perPage))}` : '';
    return `/v3/worklog/_search${query}`;
  }
}
