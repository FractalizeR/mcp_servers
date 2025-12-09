/**
 * Операция получения списка файлов (attachments) задачи
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение списка файлов по issueId
 * - Кеширование результата
 * - НЕТ загрузки/удаления/скачивания файлов
 *
 * API: GET /v2/issues/{issueId}/attachments
 */

import { ParallelExecutor } from '@fractalizer/mcp-infrastructure';
import type { BatchResult } from '@fractalizer/mcp-infrastructure';
import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';
import type { AttachmentWithUnknownFields } from '#tracker_api/entities/index.js';
import type { ServerConfig } from '#config';

/**
 * Получение списка прикрепленных файлов задачи
 */
export class GetAttachmentsOperation extends BaseOperation {
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
   * Получить список всех файлов, прикрепленных к задаче
   *
   * @param issueId - идентификатор или ключ задачи (например, 'QUEUE-123' или '12345')
   * @returns массив прикрепленных файлов
   *
   * @example
   * ```typescript
   * const attachments = await getAttachmentsOp.execute('TEST-123');
   * console.log(`Найдено ${attachments.length} файлов`);
   * ```
   */
  async execute(issueId: string): Promise<AttachmentWithUnknownFields[]> {
    const cacheKey = EntityCacheKey.createKey(EntityType.ATTACHMENT, `list:${issueId}`);

    return this.withCache(cacheKey, async () => {
      this.logger.debug(`GetAttachmentsOperation: получение списка файлов для ${issueId}`);

      const response = await this.httpClient.get<AttachmentWithUnknownFields[]>(
        `/v2/issues/${issueId}/attachments`
      );

      this.logger.info(
        `GetAttachmentsOperation: получено ${response.length} файлов для ${issueId}`
      );

      return response;
    });
  }

  /**
   * Получить списки файлов для нескольких задач параллельно
   *
   * @param issueIds - массив идентификаторов или ключей задач
   * @returns результаты batch-операции
   */
  async executeMany(
    issueIds: string[]
  ): Promise<BatchResult<string, AttachmentWithUnknownFields[]>> {
    if (issueIds.length === 0) {
      this.logger.warn('GetAttachmentsOperation: пустой массив issueIds');
      return [];
    }

    const issuesList = issueIds.join(', ');
    this.logger.info(`Получение файлов для ${issueIds.length} задач параллельно: ${issuesList}`);

    const operations = issueIds.map((issueId) => ({
      key: issueId,
      fn: async (): Promise<AttachmentWithUnknownFields[]> => this.execute(issueId),
    }));

    return this.parallelExecutor.executeParallel(operations, 'get attachments');
  }
}
