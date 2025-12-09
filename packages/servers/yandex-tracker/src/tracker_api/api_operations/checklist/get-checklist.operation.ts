/**
 * Операция получения чеклиста задачи
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение всех элементов чеклиста задачи
 * - НЕТ добавления/редактирования/удаления элементов
 *
 * API: GET /v2/issues/{issueId}/checklistItems
 */

import { ParallelExecutor } from '@fractalizer/mcp-infrastructure';
import type { BatchResult } from '@fractalizer/mcp-infrastructure';
import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import type { ChecklistItemWithUnknownFields } from '#tracker_api/entities/index.js';
import type { ServerConfig } from '#config';

export class GetChecklistOperation extends BaseOperation {
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
   * Получает чеклист задачи
   *
   * @param issueId - идентификатор или ключ задачи (например, 'QUEUE-123')
   * @returns массив элементов чеклиста
   * @throws {Error} если запрос завершился с ошибкой
   *
   * ВАЖНО:
   * - Retry делается автоматически в HttpClient.get
   * - API возвращает массив элементов чеклиста
   */
  async execute(issueId: string): Promise<ChecklistItemWithUnknownFields[]> {
    this.logger.info(`Получение чеклиста задачи ${issueId}`);

    const checklist = await this.httpClient.get<ChecklistItemWithUnknownFields[]>(
      `/v2/issues/${issueId}/checklistItems`
    );

    this.logger.info(
      `Получено ${Array.isArray(checklist) ? checklist.length : 0} элементов чеклиста для задачи ${issueId}`
    );

    return Array.isArray(checklist) ? checklist : [];
  }

  /**
   * Получает чеклисты для нескольких задач параллельно
   *
   * @param issueIds - массив идентификаторов или ключей задач
   * @returns результаты batch-операции
   */
  async executeMany(
    issueIds: string[]
  ): Promise<BatchResult<string, ChecklistItemWithUnknownFields[]>> {
    if (issueIds.length === 0) {
      this.logger.warn('GetChecklistOperation: пустой массив issueIds');
      return [];
    }

    const issuesList = issueIds.join(', ');
    this.logger.info(`Получение чеклистов для ${issueIds.length} задач параллельно: ${issuesList}`);

    const operations = issueIds.map((issueId) => ({
      key: issueId,
      fn: async (): Promise<ChecklistItemWithUnknownFields[]> => this.execute(issueId),
    }));

    return this.parallelExecutor.executeParallel(operations, 'get checklists');
  }
}
