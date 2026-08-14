/**
 * Операция получения списка статусов задач (справочник Administration)
 *
 * API: GET /v3/statuses (не пагинируется — небольшой справочник)
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { TrackerPaginator } from '#tracker_api/utils/tracker-paginator.util.js';
import type { StatusWithUnknownFields } from '#tracker_api/entities/index.js';
import type { PaginatedResult } from '#tracker_api/entities/common/index.js';

export class GetStatusesOperation extends BaseOperation {
  async execute(): Promise<PaginatedResult<StatusWithUnknownFields>> {
    this.logger.info('Получение списка статусов задач');

    const cacheKey = 'administration:statuses';
    const cached = await this.cacheManager.get<PaginatedResult<StatusWithUnknownFields>>(cacheKey);
    if (cached) {
      return cached;
    }

    const response =
      await this.httpClient.getWithResponse<StatusWithUnknownFields[]>('/v3/statuses');
    const result = TrackerPaginator.singlePage<StatusWithUnknownFields>(response);

    await this.cacheManager.set(cacheKey, result);
    return result;
  }
}
