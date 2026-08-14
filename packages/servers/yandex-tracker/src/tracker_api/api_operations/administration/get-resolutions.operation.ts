/**
 * Операция получения списка резолюций задач (справочник Administration)
 *
 * API: GET /v3/resolutions (не пагинируется — небольшой справочник)
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { TrackerPaginator } from '#tracker_api/utils/tracker-paginator.util.js';
import type { ResolutionWithUnknownFields } from '#tracker_api/entities/index.js';
import type { PaginatedResult } from '#tracker_api/entities/common/index.js';

export class GetResolutionsOperation extends BaseOperation {
  async execute(): Promise<PaginatedResult<ResolutionWithUnknownFields>> {
    this.logger.info('Получение списка резолюций задач');

    const cacheKey = 'administration:resolutions';
    const cached =
      await this.cacheManager.get<PaginatedResult<ResolutionWithUnknownFields>>(cacheKey);
    if (cached) {
      return cached;
    }

    const response =
      await this.httpClient.getWithResponse<ResolutionWithUnknownFields[]>('/v3/resolutions');
    const result = TrackerPaginator.singlePage<ResolutionWithUnknownFields>(response);

    await this.cacheManager.set(cacheKey, result);
    return result;
  }
}
