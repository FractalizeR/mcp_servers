/**
 * Операция удаления связи между задачами
 *
 * Ответственность (SRP):
 * - ТОЛЬКО удаление существующей связи
 * - Инвалидация кеша связей после удаления
 * - НЕТ создания/получения связей
 *
 * Соответствует API v3: DELETE /v3/issues/{issueId}/links/{linkId}
 *
 * ВАЖНО:
 * - API автоматически удаляет обратную связь для связанной задачи
 * - После удаления инвалидируется кеш для текущей задачи
 * - Retry логика встроена в HttpClient
 * - API возвращает 204 No Content при успешном удалении
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@mcp-framework/infrastructure';

export class DeleteLinkOperation extends BaseOperation {
  /**
   * Удаляет связь между задачами
   *
   * @param issueId - ключ или ID задачи (например, 'QUEUE-123')
   * @param linkId - ID связи для удаления
   *
   * ВАЖНО:
   * - API автоматически удаляет обратную связь
   * - Кеш инвалидируется для текущей задачи
   * - Retry автоматически обрабатывается в HttpClient
   * - Не выбрасывает ошибку если связь уже удалена
   *
   * @example
   * ```typescript
   * // Удалить связь с ID '67890' из задачи TEST-123
   * await operation.execute('TEST-123', '67890');
   * ```
   */
  async execute(issueId: string, linkId: string): Promise<void> {
    this.logger.info(`Удаление связи ${linkId} из задачи ${issueId}`);

    // Выполняем DELETE запрос к API
    // API возвращает 204 No Content при успешном удалении
    await this.deleteRequest<void>(`/v3/issues/${issueId}/links/${linkId}`);

    // Инвалидируем кеш связей для текущей задачи
    await this.invalidateLinksCache(issueId);

    this.logger.debug(`Связь ${linkId} удалена из задачи ${issueId}`);
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
