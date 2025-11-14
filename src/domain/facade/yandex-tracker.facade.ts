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
import type { Logger } from '@infrastructure/logger.js';
import type { ServerConfig } from '@types';

// User Operations
import { PingOperation } from '@domain/operations/user/ping.operation.js';

// Issue Operations - Batch
import { GetIssuesOperation } from '@domain/operations/issue/get-issues.operation.js';
import { CreateIssuesOperation } from '@domain/operations/issue/create-issues.operation.js';
import { UpdateIssuesOperation } from '@domain/operations/issue/update-issues.operation.js';
import { DeleteIssuesOperation } from '@domain/operations/issue/delete-issues.operation.js';

// Types
import type { PingResult } from '@domain/operations/user/ping.operation.js';
import type { CreateIssueRequest } from '@domain/entities/issue.entity.js';
import type { BatchIssueResult } from '@domain/operations/issue/get-issues.operation.js';
import type { BatchCreateIssueResult } from '@domain/operations/issue/create-issues.operation.js';
import type { UpdateIssueItem, BatchUpdateIssueResult } from '@domain/operations/issue/update-issues.operation.js';
import type { BatchDeleteIssueResult } from '@domain/operations/issue/delete-issues.operation.js';

export class YandexTrackerFacade {
  // User operations
  private readonly pingOperation: PingOperation;

  // Issue operations - Batch
  private readonly getIssuesOperation: GetIssuesOperation;
  private readonly createIssuesOperation: CreateIssuesOperation;
  private readonly updateIssuesOperation: UpdateIssuesOperation;
  private readonly deleteIssuesOperation: DeleteIssuesOperation;

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
    this.getIssuesOperation = new GetIssuesOperation(httpClient, retryHandler, cacheManager, logger);
    this.createIssuesOperation = new CreateIssuesOperation(httpClient, retryHandler, cacheManager, logger);
    this.updateIssuesOperation = new UpdateIssuesOperation(httpClient, retryHandler, cacheManager, logger);
    this.deleteIssuesOperation = new DeleteIssuesOperation(httpClient, retryHandler, cacheManager, logger);
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

  /**
   * Создаёт несколько задач параллельно
   * @param requests - массив параметров создания задач
   * @returns массив результатов (fulfilled | rejected)
   */
  async createIssues(requests: CreateIssueRequest[]): Promise<BatchCreateIssueResult[]> {
    return this.createIssuesOperation.execute(requests);
  }

  /**
   * Обновляет несколько задач параллельно
   * @param items - массив параметров обновления задач
   * @returns массив результатов (fulfilled | rejected)
   */
  async updateIssues(items: UpdateIssueItem[]): Promise<BatchUpdateIssueResult[]> {
    return this.updateIssuesOperation.execute(items);
  }

  /**
   * Удаляет несколько задач параллельно
   * @param issueKeys - массив ключей задач
   * @returns массив результатов (fulfilled | rejected)
   */
  async deleteIssues(issueKeys: string[]): Promise<BatchDeleteIssueResult[]> {
    return this.deleteIssuesOperation.execute(issueKeys);
  }

  // Добавьте здесь другие методы по мере реализации операций:
  // async searchIssues(params: SearchIssuesParams): Promise<Issue[]>
  // async getQueue(queueKey: string): Promise<Queue>
  // async listQueues(): Promise<Queue[]>
}
