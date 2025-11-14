/**
 * Фасад для работы с API Яндекс.Трекера
 *
 * Ответственность (SRP):
 * - ТОЛЬКО инициализация операций
 * - ТОЛЬКО делегирование вызовов операциям
 * - НЕТ бизнес-логики (всё в операциях)
 *
 * Паттерн: Facade Pattern
 * Упрощает использование сложной системы операций
 */

import type { HttpClient } from '@infrastructure/http/client/http-client.js';
import type { RetryHandler } from '@infrastructure/http/retry/retry-handler.js';
import type { CacheManager } from '@infrastructure/cache/cache-manager.interface.js';
import type { Logger } from '@infrastructure/logging/index.js';
import type { ServerConfig } from '@types';

// User Operations
import { PingOperation } from '@tracker_api/operations/user/ping.operation.js';

// Issue Operations - Batch
import { GetIssuesOperation } from '@tracker_api/operations/issue/get-issues.operation.js';

// Types
import type { PingResult } from '@tracker_api/operations/user/ping.operation.js';
import type { BatchIssueResult } from '@tracker_api/operations/issue/get-issues.operation.js';

export class YandexTrackerFacade {
  // User operations
  private readonly pingOperation: PingOperation;

  // Issue operations - Batch
  private readonly getIssuesOperation: GetIssuesOperation;

  constructor(
    httpClient: HttpClient,
    retryHandler: RetryHandler,
    cacheManager: CacheManager,
    logger: Logger,
    _config: ServerConfig
  ) {
    // Инициализация user operations
    this.pingOperation = new PingOperation(httpClient, retryHandler, cacheManager, logger);

    // Инициализация issue operations - Batch
    this.getIssuesOperation = new GetIssuesOperation(
      httpClient,
      retryHandler,
      cacheManager,
      logger
    );
  }

  // === User Methods ===

  /**
   * Проверяет подключение к API Яндекс.Трекера
   * @returns результат проверки
   */
  async ping(): Promise<PingResult> {
    return this.pingOperation.execute();
  }

  // === Issue Methods - Batch ===

  /**
   * Получает несколько задач параллельно
   * @param issueKeys - массив ключей задач
   * @returns массив результатов (fulfilled | rejected)
   */
  async getIssues(issueKeys: string[]): Promise<BatchIssueResult[]> {
    return this.getIssuesOperation.execute(issueKeys);
  }
}
