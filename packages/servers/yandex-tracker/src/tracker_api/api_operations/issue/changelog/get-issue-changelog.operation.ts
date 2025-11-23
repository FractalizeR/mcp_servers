/**
 * Batch-операция получения истории изменений задач
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение истории изменений задач (GET /v3/issues/{issueKey}/changelog)
 * - Параллельное выполнение через ParallelExecutor (с throttling)
 * - Соблюдение maxConcurrentRequests из конфигурации
 * - НЕТ создания/обновления/удаления
 * - НЕТ других операций с задачами
 *
 * Документация Python SDK:
 * - yandex_tracker_client/collections.py:638 - changelog property
 * - yandex_tracker_client/collections.py:1073 - IssueChangelog collection
 *
 * API v3: GET /v3/issues/{issueKey}/changelog
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { ParallelExecutor } from '@mcp-framework/infrastructure';
import type { ChangelogEntryWithUnknownFields } from '#tracker_api/entities/index.js';
import type { BatchResult } from '@mcp-framework/infrastructure';
import type { ServerConfig } from '#config';

/**
 * Результат batch-операции для changelog
 * Использует стандартизированный тип BatchResult из @types
 *
 * Generic параметры:
 * - TKey = string (issueKey: 'QUEUE-123')
 * - TValue = ChangelogEntryWithUnknownFields[]
 */
export type BatchChangelogResult = BatchResult<string, ChangelogEntryWithUnknownFields[]>[number];

export class GetIssueChangelogOperation extends BaseOperation {
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
   * Получает историю изменений нескольких задач параллельно с контролем concurrency
   *
   * @param issueKeys - массив ключей задач (например, ['QUEUE-123', 'QUEUE-456'])
   * @returns массив результатов (fulfilled | rejected) в том же порядке, что и входные ключи
   * @throws {Error} если количество ключей превышает maxBatchSize (валидация в ParallelExecutor)
   *
   * ВАЖНО:
   * - Использует ParallelExecutor → соблюдается maxConcurrentRequests
   * - Retry делается ТОЛЬКО в HttpClient.get (нет двойного retry)
   * - История возвращается в хронологическом порядке (от старых к новым)
   * - Кеширование НЕ используется (история может часто меняться)
   */
  async execute(issueKeys: string[]): Promise<BatchChangelogResult[]> {
    // Проверка на пустой массив
    if (issueKeys.length === 0) {
      this.logger.warn('GetIssueChangelogOperation: пустой массив ключей');
      return [];
    }

    this.logger.info(
      `Получение истории изменений для ${issueKeys.length} задач: ${issueKeys.join(', ')}`
    );

    // Создаём операции без кеширования (история часто меняется)
    const operations = issueKeys.map((issueKey) => ({
      key: issueKey,
      fn: async (): Promise<ChangelogEntryWithUnknownFields[]> => {
        // API v3: GET /v3/issues/{issueKey}/changelog
        // Возвращает массив записей истории
        const changelog = await this.httpClient.get<ChangelogEntryWithUnknownFields[]>(
          `/v3/issues/${issueKey}/changelog`
        );

        this.logger.debug(`История изменений для ${issueKey}: ${changelog.length} записей`);
        return changelog;
      },
    }));

    // Выполняем через ParallelExecutor (централизованный throttling)
    return this.parallelExecutor.executeParallel(operations, 'get issue changelog');
  }
}
