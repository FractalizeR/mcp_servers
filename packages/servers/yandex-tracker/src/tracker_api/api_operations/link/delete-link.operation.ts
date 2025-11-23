/**
 * Операция удаления связи между задачами
 *
 * Ответственность (SRP):
 * - ТОЛЬКО удаление существующей связи (single и batch режимы)
 * - Параллельное выполнение через ParallelExecutor (batch режим)
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
import { EntityCacheKey, EntityType, ParallelExecutor } from '@mcp-framework/infrastructure';
import type { BatchResult } from '@mcp-framework/infrastructure';
import type { ServerConfig } from '#config';

export class DeleteLinkOperation extends BaseOperation {
  private readonly parallelExecutor: ParallelExecutor;

  constructor(
    httpClient: ConstructorParameters<typeof BaseOperation>[0],
    cacheManager: ConstructorParameters<typeof BaseOperation>[1],
    logger: ConstructorParameters<typeof BaseOperation>[2],
    config: ServerConfig
  ) {
    super(httpClient, cacheManager, logger);

    this.parallelExecutor = new ParallelExecutor(logger, {
      maxBatchSize: config.maxBatchSize,
      maxConcurrentRequests: config.maxConcurrentRequests,
    });
  }
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
   * Удаляет связи из нескольких задач параллельно
   *
   * @param links - массив связей для удаления с индивидуальными параметрами
   * @returns массив результатов в формате BatchResult
   * @throws {Error} если количество задач превышает maxBatchSize
   *
   * ВАЖНО:
   * - Каждая задача имеет свои параметры (issueId, linkId)
   * - Использует ParallelExecutor для соблюдения maxConcurrentRequests
   * - Retry делается автоматически в HttpClient.delete
   * - Для DELETE операций возвращаем void, key - уникальная комбинация issueId+linkId
   */
  async executeMany(
    links: Array<{ issueId: string; linkId: string }>
  ): Promise<BatchResult<string, void>> {
    // Проверка на пустой массив
    if (links.length === 0) {
      this.logger.warn('DeleteLinkOperation: пустой массив связей');
      return [];
    }

    this.logger.info(
      `Удаление ${links.length} связей параллельно: ${links.map((l) => `${l.issueId}/${l.linkId}`).join(', ')}`
    );

    // Создаём операции для каждой связи
    const operations = links.map(({ issueId, linkId }) => ({
      // Уникальный ключ: комбинация issueId + linkId
      key: `${issueId}:${linkId}`,
      fn: async (): Promise<void> => {
        // Вызываем существующий метод execute() для каждой связи
        return this.execute(issueId, linkId);
      },
    }));

    // Выполняем через ParallelExecutor (централизованный throttling)
    return this.parallelExecutor.executeParallel(operations, 'delete links');
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
