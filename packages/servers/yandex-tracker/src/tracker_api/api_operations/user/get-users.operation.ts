/**
 * Batch-операция получения нескольких пользователей параллельно
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение нескольких пользователей по login/uid (batch-режим)
 * - Параллельное выполнение через ParallelExecutor (с throttling)
 * - НЕТ получения списка всех пользователей (см. FindUsersOperation)
 *
 * API: GET /v3/users/{id} (id — login или uid)
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { ParallelExecutor, EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';
import type { UserWithUnknownFields } from '#tracker_api/entities/index.js';
import type { BatchResult } from '@fractalizer/mcp-infrastructure';
import type { ServerConfig } from '#config';

export type BatchUserResult = BatchResult<string, UserWithUnknownFields>[number];

export class GetUsersOperation extends BaseOperation {
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
   * Получает несколько пользователей параллельно с контролем concurrency.
   *
   * @param userIds - массив login/uid пользователей
   * @returns массив результатов (fulfilled | rejected) в том же порядке
   */
  async execute(userIds: string[]): Promise<BatchUserResult[]> {
    if (userIds.length === 0) {
      this.logger.warn('GetUsersOperation: пустой массив идентификаторов');
      return [];
    }

    this.logger.info(`Получение ${userIds.length} пользователей параллельно`);

    const operations = userIds.map((userId) => ({
      key: userId,
      fn: async (): Promise<UserWithUnknownFields> => {
        const cacheKey = EntityCacheKey.createKey(EntityType.USER, userId);
        return this.withCache(cacheKey, async () =>
          this.httpClient.get<UserWithUnknownFields>(`/v3/users/${encodeURIComponent(userId)}`)
        );
      },
    }));

    return this.parallelExecutor.executeParallel(operations, 'get users');
  }
}
