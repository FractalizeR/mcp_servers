/**
 * Операция получения списка файлов (attachments) задачи
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение списка файлов по issueId (single и batch режимы)
 * - Кеширование результата (канонический ключ list:${issueId})
 * - НЕТ загрузки/удаления/скачивания файлов
 *
 * ВАЖНО: эндпоинт НЕ пагинируется — API отдаёт все вложения за один ответ
 * (подтверждено сырыми заголовками: нет `Link rel="next"`). Поэтому запрос
 * выполняется ровно один раз, без пагинационных query-параметров.
 *
 * Возвращаемый тип сохранён как `PaginatedResult<...>` ради совместимости
 * сигнатур facade/service: `singlePage(response)` (легаси-режим, без tag)
 * всегда даёт `hasNextPage=false`, т.к. Link-заголовка нет.
 *
 * API: GET /v2/issues/{issueId}/attachments
 */

import { ParallelExecutor } from '@fractalizer/mcp-infrastructure';
import type { BatchResult } from '@fractalizer/mcp-infrastructure';
import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';
import { TrackerPaginator } from '#tracker_api/utils/index.js';
import type { AttachmentWithUnknownFields } from '#tracker_api/entities/index.js';
import type { PaginatedResult } from '#tracker_api/entities/index.js';
import type { GetAttachmentsInput } from '#tracker_api/dto/attachment/get-attachments.input.js';
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
   * Получить список файлов, прикрепленных к задаче (все за один ответ).
   *
   * @param issueId - идентификатор или ключ задачи (например, 'QUEUE-123' или '12345')
   * @returns результат со всеми вложениями (hasNextPage всегда false)
   */
  async execute(
    issueId: string,
    _input: GetAttachmentsInput = {}
  ): Promise<PaginatedResult<AttachmentWithUnknownFields>> {
    // Кеш под каноническим ключом list:${issueId} — его инвалидируют upload/delete.
    // Пагинационных параметров нет, поэтому ключ зависит только от issueId.
    const cacheKey = EntityCacheKey.createKey(EntityType.ATTACHMENT, `list:${issueId}`);
    return this.withCache(cacheKey, async () => this.fetch(issueId));
  }

  /**
   * Выполнить единственный HTTP-запрос и собрать `PaginatedResult` (без кеша).
   */
  private async fetch(issueId: string): Promise<PaginatedResult<AttachmentWithUnknownFields>> {
    this.logger.debug(`GetAttachmentsOperation: получение списка файлов для ${issueId}`);

    const path = `/v2/issues/${issueId}/attachments`;
    const response = await this.httpClient.getWithResponse<AttachmentWithUnknownFields[]>(path);

    // Без tag → легаси-режим singlePage: hasNextPage=false (Link-заголовка нет).
    const result = TrackerPaginator.singlePage<AttachmentWithUnknownFields>(response);

    this.logger.info(
      `GetAttachmentsOperation: получено ${result.items.length} файлов для ${issueId}`
    );

    return result;
  }

  /**
   * Получить списки файлов для нескольких задач параллельно
   *
   * @param issueIds - массив идентификаторов или ключей задач
   * @returns результаты batch-операции с PaginatedResult в value
   */
  async executeMany(
    issueIds: string[],
    _input: GetAttachmentsInput = {}
  ): Promise<BatchResult<string, PaginatedResult<AttachmentWithUnknownFields>>> {
    if (issueIds.length === 0) {
      this.logger.warn('GetAttachmentsOperation: пустой массив issueIds');
      return [];
    }

    const issuesList = issueIds.join(', ');
    this.logger.info(`Получение файлов для ${issueIds.length} задач параллельно: ${issuesList}`);

    const operations = issueIds.map((issueId) => ({
      key: issueId,
      fn: async (): Promise<PaginatedResult<AttachmentWithUnknownFields>> => this.execute(issueId),
    }));

    return this.parallelExecutor.executeParallel(operations, 'get attachments');
  }
}
