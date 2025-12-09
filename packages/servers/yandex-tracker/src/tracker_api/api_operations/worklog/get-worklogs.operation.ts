/**
 * Операция получения списка записей времени задачи
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение записей времени задачи (single и batch режимы)
 * - Параллельное выполнение через ParallelExecutor (batch режим)
 * - НЕТ добавления/редактирования/удаления записей
 *
 * API: GET /v2/issues/{issueId}/worklog
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { ParallelExecutor } from '@fractalizer/mcp-infrastructure';
import type { WorklogWithUnknownFields } from '#tracker_api/entities/index.js';
import type { BatchResult } from '@fractalizer/mcp-infrastructure';
import type { ServerConfig } from '#config';

export class GetWorklogsOperation extends BaseOperation {
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
   * Получает список записей времени задачи
   *
   * @param issueId - идентификатор или ключ задачи (например, 'QUEUE-123')
   * @returns массив записей времени
   * @throws {Error} если запрос завершился с ошибкой
   *
   * ВАЖНО:
   * - Retry делается автоматически в HttpClient.get
   * - API возвращает массив записей времени
   * - Эндпоинт из API v2 (не v3!)
   */
  async execute(issueId: string): Promise<WorklogWithUnknownFields[]> {
    this.logger.info(`Получение записей времени задачи ${issueId}`);

    const endpoint = `/v2/issues/${issueId}/worklog`;

    const worklogs = await this.httpClient.get<WorklogWithUnknownFields[]>(endpoint);

    this.logger.info(
      `Получено ${Array.isArray(worklogs) ? worklogs.length : 1} записей времени для задачи ${issueId}`
    );

    return Array.isArray(worklogs) ? worklogs : [worklogs];
  }

  /**
   * Получает записи времени для нескольких задач параллельно
   *
   * @param issueIds - массив идентификаторов задач
   * @returns массив результатов в формате BatchResult
   * @throws {Error} если количество задач превышает maxBatchSize
   *
   * ВАЖНО:
   * - Использует ParallelExecutor для соблюдения maxConcurrentRequests
   * - Retry делается автоматически в HttpClient.get
   */
  async executeMany(issueIds: string[]): Promise<BatchResult<string, WorklogWithUnknownFields[]>> {
    // Проверка на пустой массив
    if (issueIds.length === 0) {
      this.logger.warn('GetWorklogsOperation: пустой массив идентификаторов');
      return [];
    }

    this.logger.info(
      `Получение записей времени для ${issueIds.length} задач параллельно: ${issueIds.join(', ')}`
    );

    // Создаём операции для каждой задачи
    const operations = issueIds.map((issueId) => ({
      key: issueId,
      fn: async (): Promise<WorklogWithUnknownFields[]> => {
        // Вызываем существующий метод execute() для каждой задачи
        return this.execute(issueId);
      },
    }));

    // Выполняем через ParallelExecutor (централизованный throttling)
    return this.parallelExecutor.executeParallel(operations, 'get worklogs');
  }
}
