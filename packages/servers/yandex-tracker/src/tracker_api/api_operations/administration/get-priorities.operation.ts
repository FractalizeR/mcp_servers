/**
 * Операция получения списка приоритетов задач (справочник Administration)
 *
 * API: GET /v3/priorities (не пагинируется — небольшой справочник)
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { TrackerPaginator } from '#tracker_api/utils/tracker-paginator.util.js';
import type { PriorityWithUnknownFields } from '#tracker_api/entities/index.js';
import type { PaginatedResult } from '#tracker_api/entities/common/index.js';

export class GetPrioritiesOperation extends BaseOperation {
  async execute(): Promise<PaginatedResult<PriorityWithUnknownFields>> {
    this.logger.info('Получение списка приоритетов задач');

    const cacheKey = 'administration:priorities';
    const cached =
      await this.cacheManager.get<PaginatedResult<PriorityWithUnknownFields>>(cacheKey);
    if (cached) {
      return cached;
    }

    const response =
      await this.httpClient.getWithResponse<PriorityWithUnknownFields[]>('/v3/priorities');
    const result = TrackerPaginator.singlePage<PriorityWithUnknownFields>(response);

    await this.cacheManager.set(cacheKey, result);
    return result;
  }
}
