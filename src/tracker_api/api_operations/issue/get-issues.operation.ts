/**
 * Batch-операция получения нескольких задач параллельно
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение нескольких задач по ключам (batch-режим)
 * - Параллельное выполнение через ParallelExecutor (с throttling)
 * - Соблюдение maxConcurrentRequests из конфигурации
 * - НЕТ создания/обновления/удаления
 * - НЕТ поиска задач
 *
 * КРИТИЧЕСКИЕ ИЗМЕНЕНИЯ:
 * - Использует ParallelExecutor вместо Promise.allSettled (централизованный throttling)
 * - Удалён двойной retry (HttpClient.get уже делает retry)
 * - Unified BatchResult формат (с key и index полями)
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@infrastructure/cache/entity-cache-key.js';
import { ParallelExecutor } from '@infrastructure/async/parallel-executor.js';
import type { IssueWithUnknownFields } from '@tracker_api/entities/index.js';
import type { BatchResult, ServerConfig } from '@types';

/**
 * Результат batch-операции для задач
 * Использует стандартизированный тип BatchResult из @types
 *
 * Generic параметры:
 * - TKey = string (issueKey: 'QUEUE-123')
 * - TValue = IssueWithUnknownFields
 */
export type BatchIssueResult = BatchResult<string, IssueWithUnknownFields>[number];

export class GetIssuesOperation extends BaseOperation {
  private readonly parallelExecutor: ParallelExecutor;

  constructor(
    httpClient: ConstructorParameters<typeof BaseOperation>[0],
    retryHandler: ConstructorParameters<typeof BaseOperation>[1],
    cacheManager: ConstructorParameters<typeof BaseOperation>[2],
    logger: ConstructorParameters<typeof BaseOperation>[3],
    config: ServerConfig
  ) {
    super(httpClient, retryHandler, cacheManager, logger);

    // Инициализируем ParallelExecutor для соблюдения concurrency limits
    this.parallelExecutor = new ParallelExecutor(logger, {
      maxBatchSize: config.maxBatchSize,
      maxConcurrentRequests: config.maxConcurrentRequests,
    });
  }

  /**
   * Получает несколько задач параллельно с контролем concurrency
   *
   * @param issueKeys - массив ключей задач (например, ['QUEUE-123', 'QUEUE-456'])
   * @returns массив результатов (fulfilled | rejected) в том же порядке, что и входные ключи
   * @throws {Error} если количество ключей превышает maxBatchSize (валидация в ParallelExecutor)
   *
   * ВАЖНО:
   * - Использует ParallelExecutor → соблюдается maxConcurrentRequests
   * - Retry делается ТОЛЬКО в HttpClient.get (нет двойного retry)
   * - Кеширование работает для каждой задачи индивидуально
   */
  async execute(issueKeys: string[]): Promise<BatchIssueResult[]> {
    // Проверка на пустой массив
    if (issueKeys.length === 0) {
      this.logger.warn('GetIssuesOperation: пустой массив ключей');
      return [];
    }

    this.logger.info(`Получение ${issueKeys.length} задач параллельно: ${issueKeys.join(', ')}`);

    // Создаём операции с кешированием для каждой задачи
    const operations = issueKeys.map((issueKey) => ({
      key: issueKey,
      fn: async (): Promise<IssueWithUnknownFields> => {
        const cacheKey = EntityCacheKey.createKey(EntityType.ISSUE, issueKey);

        return this.withCache(cacheKey, async () => {
          // ВАЖНО: withRetry УДАЛЁН — retry уже внутри httpClient.get
          // Это исправляет проблему "двойного retry" (3×3=9 попыток)
          return this.httpClient.get<IssueWithUnknownFields>(`/v3/issues/${issueKey}`);
        });
      },
    }));

    // Выполняем через ParallelExecutor (централизованный throttling)
    // Это исправляет проблему "игнорирования maxConcurrentRequests"
    return this.parallelExecutor.executeParallel(operations, 'get issues');
  }
}
