/**
 * Batch-операция получения связей нескольких задач параллельно
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение связей нескольких задач по ключам (batch-режим)
 * - Параллельное выполнение через ParallelExecutor (с throttling)
 * - Соблюдение maxConcurrentRequests из конфигурации
 * - НЕТ создания/удаления связей
 *
 * Соответствует API v3: GET /v3/issues/{issueId}/links
 *
 * КРИТИЧЕСКИЕ ИЗМЕНЕНИЯ:
 * - Использует ParallelExecutor вместо Promise.allSettled (централизованный throttling)
 * - Unified BatchResult формат (с key и index полями)
 * - Кеширование работает для каждой задачи индивидуально
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType, ParallelExecutor } from '@fractalizer/mcp-infrastructure';
import type { LinkWithUnknownFields } from '#tracker_api/entities/index.js';
import type { BatchResult } from '@fractalizer/mcp-infrastructure';
import type { ServerConfig } from '#config';

/**
 * Результат batch-операции для связей
 * Использует стандартизированный тип BatchResult из @types
 *
 * Generic параметры:
 * - TKey = string (issueKey: 'QUEUE-123')
 * - TValue = LinkWithUnknownFields[]
 */
export type BatchIssueLinksResult = BatchResult<string, LinkWithUnknownFields[]>[number];

export class GetIssueLinksOperation extends BaseOperation {
  private readonly parallelExecutor: ParallelExecutor;

  constructor(
    httpClient: ConstructorParameters<typeof BaseOperation>[0],
    cacheManager: ConstructorParameters<typeof BaseOperation>[1],
    logger: ConstructorParameters<typeof BaseOperation>[2],
    config: ServerConfig
  ) {
    super(httpClient, cacheManager, logger);

    // Инициализируем ParallelExecutor для соблюдения concurrency limits
    this.parallelExecutor = new ParallelExecutor(logger, {
      maxBatchSize: config.maxBatchSize,
      maxConcurrentRequests: config.maxConcurrentRequests,
    });
  }

  /**
   * Получает связи для нескольких задач параллельно с контролем concurrency
   *
   * @param issueIds - массив ключей задач (например, ['QUEUE-123', 'QUEUE-456'])
   * @returns массив результатов (fulfilled | rejected) в том же порядке, что и входные ключи
   * @throws {Error} если количество ключей превышает maxBatchSize (валидация в ParallelExecutor)
   *
   * ВАЖНО:
   * - Использует ParallelExecutor → соблюдается maxConcurrentRequests
   * - Retry делается ТОЛЬКО в HttpClient.get (нет двойного retry)
   * - Кеширование работает для каждой задачи индивидуально
   * - API возвращает пустой массив, если связей нет
   */
  async execute(issueIds: string[]): Promise<BatchIssueLinksResult[]> {
    // Проверка на пустой массив
    if (issueIds.length === 0) {
      this.logger.warn('GetIssueLinksOperation: пустой массив ключей');
      return [];
    }

    this.logger.info(
      `Получение связей для ${issueIds.length} задач параллельно: ${issueIds.join(', ')}`
    );

    // Создаём операции с кешированием для каждой задачи
    const operations = issueIds.map((issueId) => ({
      key: issueId,
      fn: async (): Promise<LinkWithUnknownFields[]> => {
        const cacheKey = EntityCacheKey.createKey(EntityType.ISSUE, `${issueId}/links`);

        return this.withCache(cacheKey, async () => {
          // ВАЖНО: retry уже внутри httpClient.get
          const response = await this.httpClient.get<LinkWithUnknownFields[]>(
            `/v3/issues/${issueId}/links`
          );

          this.logger.debug(`Получено ${response.length} связей для задачи ${issueId}`);

          return response;
        });
      },
    }));

    // Выполняем через ParallelExecutor (централизованный throttling)
    return this.parallelExecutor.executeParallel(operations, 'get issue links');
  }
}
