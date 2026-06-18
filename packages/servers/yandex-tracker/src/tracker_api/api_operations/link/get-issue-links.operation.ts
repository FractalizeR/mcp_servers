/**
 * Batch-операция получения связей нескольких задач параллельно
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение связей нескольких задач по ключам (batch-режим)
 * - Пагинация: одна страница (по умолчанию) или полный обход (fetchAll)
 * - Параллельное выполнение через ParallelExecutor (с throttling)
 * - Соблюдение maxConcurrentRequests из конфигурации
 * - НЕТ создания/удаления связей
 *
 * Соответствует API v3: GET /v3/issues/{issueId}/links
 *
 * ВАЖНО:
 * - Использует ParallelExecutor вместо Promise.allSettled (централизованный throttling)
 * - Unified BatchResult формат (с key и index полями)
 * - Кеширование работает для каждой задачи индивидуально (ключ учитывает пагинацию)
 * - Link-следование no-op, если заголовка нет (контракт стабилен)
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType, ParallelExecutor } from '@fractalizer/mcp-infrastructure';
import { TrackerPaginator, DEFAULT_MAX_PER_PAGE } from '#tracker_api/utils/index.js';
import type { LinkWithUnknownFields } from '#tracker_api/entities/index.js';
import type { PaginatedResult } from '#tracker_api/entities/index.js';
import type { GetIssueLinksInput } from '#tracker_api/dto/link/get-issue-links.input.js';
import type { BatchResult } from '@fractalizer/mcp-infrastructure';
import type { ServerConfig } from '#config';

/**
 * Результат batch-операции для связей
 * Использует стандартизированный тип BatchResult из @types
 *
 * Generic параметры:
 * - TKey = string (issueKey: 'QUEUE-123')
 * - TValue = PaginatedResult<LinkWithUnknownFields>
 */
export type BatchIssueLinksResult = BatchResult<
  string,
  PaginatedResult<LinkWithUnknownFields>
>[number];

export class GetIssueLinksOperation extends BaseOperation {
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
   * Получает связи для нескольких задач параллельно с контролем concurrency
   *
   * @param issueIds - массив ключей задач (например, ['QUEUE-123', 'QUEUE-456'])
   * @param input - параметры пагинации (применяются ко всем задачам)
   * @returns массив результатов (fulfilled | rejected) в том же порядке, что и входные ключи
   * @throws {Error} если количество ключей превышает maxBatchSize (валидация в ParallelExecutor)
   *
   * ВАЖНО:
   * - Использует ParallelExecutor → соблюдается maxConcurrentRequests
   * - Retry делается ТОЛЬКО в HttpClient (нет двойного retry)
   * - Кеширование работает для каждой задачи индивидуально
   * - API возвращает пустой массив, если связей нет
   */
  async execute(
    issueIds: string[],
    input: GetIssueLinksInput = {}
  ): Promise<BatchIssueLinksResult[]> {
    // Проверка на пустой массив
    if (issueIds.length === 0) {
      this.logger.warn('GetIssueLinksOperation: пустой массив ключей');
      return [];
    }

    this.logger.info(
      `Получение связей для ${issueIds.length} задач параллельно: ${issueIds.join(', ')}`
    );

    const fetchAll = input.fetchAll === true;
    const effectivePerPage = fetchAll ? (input.perPage ?? DEFAULT_MAX_PER_PAGE) : input.perPage;

    // Создаём операции с кешированием для каждой задачи
    const operations = issueIds.map((issueId) => ({
      key: issueId,
      fn: async (): Promise<PaginatedResult<LinkWithUnknownFields>> => {
        const cacheSuffix = `${issueId}/links:p=${input.page ?? ''}:pp=${effectivePerPage ?? ''}:all=${fetchAll}:mi=${input.maxItems ?? ''}`;
        const cacheKey = EntityCacheKey.createKey(EntityType.ISSUE, cacheSuffix);

        return this.withCache(cacheKey, async () => {
          const path = this.buildPath(issueId, input.page, effectivePerPage);
          const first = await this.httpClient.getWithResponse<LinkWithUnknownFields[]>(path);

          const result = fetchAll
            ? await TrackerPaginator.fetchAllPages<LinkWithUnknownFields>({
                firstResponse: first,
                requestNext: (p) => this.httpClient.getWithResponse<LinkWithUnknownFields[]>(p),
                ...(input.maxItems !== undefined ? { maxItems: input.maxItems } : {}),
                ...(input.page !== undefined ? { page: input.page } : {}),
                ...(effectivePerPage !== undefined ? { perPage: effectivePerPage } : {}),
              })
            : TrackerPaginator.singlePage<LinkWithUnknownFields>(first, {
                page: input.page,
                perPage: input.perPage,
              });

          this.logger.debug(`Получено ${result.items.length} связей для задачи ${issueId}`);

          return result;
        });
      },
    }));

    // Выполняем через ParallelExecutor (централизованный throttling)
    return this.parallelExecutor.executeParallel(operations, 'get issue links');
  }

  /**
   * Построить путь с query-параметрами пагинации.
   */
  private buildPath(issueId: string, page?: number, perPage?: number): string {
    const base = `/v3/issues/${issueId}/links`;
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
