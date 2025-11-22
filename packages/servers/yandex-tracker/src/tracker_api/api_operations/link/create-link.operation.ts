/**
 * Операция создания связи между задачами
 *
 * Ответственность (SRP):
 * - ТОЛЬКО создание связи между двумя задачами
 * - Валидация входных параметров
 * - Инвалидация кеша связей после создания
 * - НЕТ получения/удаления связей
 *
 * Соответствует API v3: POST /v3/issues/{issueId}/links
 *
 * ВАЖНО:
 * - API автоматически создаёт обратную связь для связываемой задачи
 * - После создания связи инвалидируется кеш для обеих задач
 * - Retry логика встроена в HttpClient
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@mcp-framework/infrastructure';
import type { LinkWithUnknownFields } from '#tracker_api/entities/index.js';
import type { CreateLinkDto } from '#tracker_api/dto/index.js';

export class CreateLinkOperation extends BaseOperation {
  /**
   * Создаёт связь между текущей и указанной задачей
   *
   * @param issueId - ключ или ID текущей задачи (например, 'QUEUE-123')
   * @param params - параметры связи (relationship и issue)
   * @returns созданная связь
   *
   * ВАЖНО:
   * - API автоматически создаёт обратную связь
   * - Кеш инвалидируется для обеих задач
   * - Retry автоматически обрабатывается в HttpClient
   *
   * @example
   * ```typescript
   * // Создать связь "TEST-123 имеет подзадачу TEST-456"
   * const link = await operation.execute('TEST-123', {
   *   relationship: 'has subtasks',
   *   issue: 'TEST-456'
   * });
   * ```
   */
  async execute(issueId: string, params: CreateLinkDto): Promise<LinkWithUnknownFields> {
    this.logger.info(
      `Создание связи для задачи ${issueId}: ${params.relationship} → ${params.issue}`
    );

    // Выполняем POST запрос к API
    const link = await this.httpClient.post<LinkWithUnknownFields>(
      `/v3/issues/${issueId}/links`,
      params
    );

    // Инвалидируем кеш связей для обеих задач
    // (API автоматически создал обратную связь)
    await this.invalidateLinksCache(issueId);
    await this.invalidateLinksCache(params.issue);

    this.logger.debug(`Связь создана: ${link.id} (${link.type.id})`);

    return link;
  }

  /**
   * Инвалидирует кеш связей для задачи
   *
   * @param issueId - ключ или ID задачи
   */
  private async invalidateLinksCache(issueId: string): Promise<void> {
    const cacheKey = EntityCacheKey.createKey(EntityType.ISSUE, `${issueId}/links`);
    await this.cacheManager.delete(cacheKey);
    this.logger.debug(`Инвалидирован кеш связей для задачи: ${issueId}`);
  }
}
