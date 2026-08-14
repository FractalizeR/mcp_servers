/**
 * Операция получения списка типов задач (справочник Administration)
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение полного списка типов задач
 * - НЕТ создания/редактирования (низкая ценность — администраторская операция,
 *   см. отчёт пакета 7.2.B; агенту нужен READ, чтобы не угадывать ключи `type`)
 *
 * API: GET /v3/issuetypes (не пагинируется — небольшой справочник)
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { TrackerPaginator } from '#tracker_api/utils/tracker-paginator.util.js';
import type { IssueTypeWithUnknownFields } from '#tracker_api/entities/index.js';
import type { PaginatedResult } from '#tracker_api/entities/common/index.js';

export class GetIssueTypesOperation extends BaseOperation {
  async execute(): Promise<PaginatedResult<IssueTypeWithUnknownFields>> {
    this.logger.info('Получение списка типов задач');

    const cacheKey = 'administration:issuetypes';
    const cached =
      await this.cacheManager.get<PaginatedResult<IssueTypeWithUnknownFields>>(cacheKey);
    if (cached) {
      return cached;
    }

    const response =
      await this.httpClient.getWithResponse<IssueTypeWithUnknownFields[]>('/v3/issuetypes');
    const result = TrackerPaginator.singlePage<IssueTypeWithUnknownFields>(response);

    await this.cacheManager.set(cacheKey, result);
    return result;
  }
}
