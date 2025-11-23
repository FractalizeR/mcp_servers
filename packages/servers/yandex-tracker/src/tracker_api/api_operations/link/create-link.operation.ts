/**
 * Операция создания связи между задачами
 *
 * Ответственность (SRP):
 * - ТОЛЬКО создание связи между двумя задачами (single и batch режимы)
 * - Параллельное выполнение через ParallelExecutor (batch режим)
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
import {
  EntityCacheKey,
  EntityType,
  ParallelExecutor,
  type BatchResult,
} from '@mcp-framework/infrastructure';
import type { LinkWithUnknownFields, LinkRelationship } from '#tracker_api/entities/index.js';
import type { CreateLinkDto } from '#tracker_api/dto/index.js';
import type { ServerConfig } from '#config';

export class CreateLinkOperation extends BaseOperation {
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
   * Создаёт связи для нескольких задач параллельно
   *
   * @param links - массив связей с индивидуальными параметрами
   * @returns массив результатов в формате BatchResult
   * @throws {Error} если количество связей превышает maxBatchSize
   *
   * ВАЖНО:
   * - Каждая связь имеет свои параметры (issueId, relationship, targetIssue)
   * - Использует ParallelExecutor для соблюдения maxConcurrentRequests
   * - API автоматически создаёт обратные связи
   * - Retry делается автоматически в HttpClient.post
   * - Кеш инвалидируется для всех задач (source и target)
   */
  async executeMany(
    links: Array<{ issueId: string; relationship: LinkRelationship; targetIssue: string }>
  ): Promise<BatchResult<string, LinkWithUnknownFields>> {
    // Проверка на пустой массив
    if (links.length === 0) {
      this.logger.warn('CreateLinkOperation: пустой массив связей');
      return [];
    }

    this.logger.info(
      `Создание ${links.length} связей параллельно: ${links.map((l) => `${l.issueId} ${l.relationship} ${l.targetIssue}`).join(', ')}`
    );

    // Создаём операции для каждой связи
    const operations = links.map(({ issueId, relationship, targetIssue }) => ({
      key: issueId,
      fn: async (): Promise<LinkWithUnknownFields> => {
        // Вызываем существующий метод execute() для каждой связи с индивидуальными параметрами
        return this.execute(issueId, { relationship, issue: targetIssue });
      },
    }));

    // Выполняем через ParallelExecutor (централизованный throttling)
    return this.parallelExecutor.executeParallel(operations, 'create links');
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
