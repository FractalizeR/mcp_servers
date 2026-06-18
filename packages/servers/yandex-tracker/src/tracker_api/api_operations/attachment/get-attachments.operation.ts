/**
 * Операция получения списка файлов (attachments) задачи
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение списка файлов по issueId (single и batch режимы)
 * - Пагинация: одна страница (по умолчанию) или полный обход (fetchAll)
 * - Кеширование результата (ключ учитывает параметры пагинации)
 * - НЕТ загрузки/удаления/скачивания файлов
 *
 * API: GET /v2/issues/{issueId}/attachments
 */

import { ParallelExecutor } from '@fractalizer/mcp-infrastructure';
import type { BatchResult } from '@fractalizer/mcp-infrastructure';
import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';
import { TrackerPaginator, DEFAULT_MAX_PER_PAGE } from '#tracker_api/utils/index.js';
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
   * Получить список файлов, прикрепленных к задаче (одна страница или полный обход)
   *
   * @param issueId - идентификатор или ключ задачи (например, 'QUEUE-123' или '12345')
   * @param input - параметры пагинации (page/perPage/fetchAll/maxItems)
   * @returns пагинированный результат с метаданными
   *
   * ВАЖНО: Link-следование no-op, если заголовка нет (контракт стабилен).
   */
  async execute(
    issueId: string,
    input: GetAttachmentsInput = {}
  ): Promise<PaginatedResult<AttachmentWithUnknownFields>> {
    const fetchAll = input.fetchAll === true;
    const effectivePerPage = fetchAll ? (input.perPage ?? DEFAULT_MAX_PER_PAGE) : input.perPage;
    const cacheSuffix = `list:${issueId}:p=${input.page ?? ''}:pp=${effectivePerPage ?? ''}:all=${fetchAll}:mi=${input.maxItems ?? ''}`;
    const cacheKey = EntityCacheKey.createKey(EntityType.ATTACHMENT, cacheSuffix);

    return this.withCache(cacheKey, async () => {
      this.logger.debug(`GetAttachmentsOperation: получение списка файлов для ${issueId}`);

      const path = this.buildPath(issueId, input.page, effectivePerPage);
      const first = await this.httpClient.getWithResponse<AttachmentWithUnknownFields[]>(path);

      const result = fetchAll
        ? await TrackerPaginator.fetchAllPages<AttachmentWithUnknownFields>({
            firstResponse: first,
            requestNext: (p) => this.httpClient.getWithResponse<AttachmentWithUnknownFields[]>(p),
            ...(input.maxItems !== undefined ? { maxItems: input.maxItems } : {}),
            ...(input.page !== undefined ? { page: input.page } : {}),
            ...(effectivePerPage !== undefined ? { perPage: effectivePerPage } : {}),
          })
        : TrackerPaginator.singlePage<AttachmentWithUnknownFields>(first, {
            page: input.page,
            perPage: input.perPage,
          });

      this.logger.info(
        `GetAttachmentsOperation: получено ${result.items.length} файлов для ${issueId}`
      );

      return result;
    });
  }

  /**
   * Получить списки файлов для нескольких задач параллельно
   *
   * @param issueIds - массив идентификаторов или ключей задач
   * @param input - параметры пагинации (применяются ко всем задачам)
   * @returns результаты batch-операции с PaginatedResult в value
   */
  async executeMany(
    issueIds: string[],
    input: GetAttachmentsInput = {}
  ): Promise<BatchResult<string, PaginatedResult<AttachmentWithUnknownFields>>> {
    if (issueIds.length === 0) {
      this.logger.warn('GetAttachmentsOperation: пустой массив issueIds');
      return [];
    }

    const issuesList = issueIds.join(', ');
    this.logger.info(`Получение файлов для ${issueIds.length} задач параллельно: ${issuesList}`);

    const operations = issueIds.map((issueId) => ({
      key: issueId,
      fn: async (): Promise<PaginatedResult<AttachmentWithUnknownFields>> =>
        this.execute(issueId, input),
    }));

    return this.parallelExecutor.executeParallel(operations, 'get attachments');
  }

  /**
   * Построить путь с query-параметрами пагинации.
   */
  private buildPath(issueId: string, page?: number, perPage?: number): string {
    const base = `/v2/issues/${issueId}/attachments`;
    const query = new URLSearchParams();
    if (page !== undefined) {
      query.set('page', String(page));
    }
    if (perPage !== undefined) {
      query.set('perPage', String(perPage));
    }
    const qs = query.toString();
    return qs.length > 0 ? `${base}?${qs}` : base;
  }
}
