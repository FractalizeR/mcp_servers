/**
 * Операция получения списка записей времени задачи
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение записей времени задачи (single и batch режимы)
 * - Пагинация: одна страница (по умолчанию) или полный обход (fetchAll)
 * - Параллельное выполнение через ParallelExecutor (batch режим)
 * - НЕТ добавления/редактирования/удаления записей
 *
 * API: GET /v2/issues/{issueId}/worklog
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { ParallelExecutor } from '@fractalizer/mcp-infrastructure';
import {
  TrackerPaginator,
  DEFAULT_MAX_PER_PAGE,
  ItemBudget,
  DEFAULT_MAX_TOTAL_ITEMS,
} from '#tracker_api/utils/index.js';
import type { WorklogWithUnknownFields } from '#tracker_api/entities/index.js';
import type { PaginatedResult } from '#tracker_api/entities/index.js';
import type { GetWorklogsInput } from '#tracker_api/dto/worklog/get-worklogs.input.js';
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
   * Получает записи времени задачи (одна страница или полный обход).
   *
   * @param issueId - идентификатор или ключ задачи (например, 'QUEUE-123')
   * @param input - параметры пагинации (page/perPage/fetchAll/maxItems)
   * @returns пагинированный результат с метаданными
   * @throws {Error} если запрос завершился с ошибкой
   *
   * ВАЖНО:
   * - Retry делается автоматически в HttpClient
   * - Эндпоинт из API v2 (не v3!)
   * - Link-следование no-op, если заголовка нет (контракт стабилен)
   */
  async execute(
    issueId: string,
    input: GetWorklogsInput = {},
    budget?: ItemBudget
  ): Promise<PaginatedResult<WorklogWithUnknownFields>> {
    this.logger.info(`Получение записей времени задачи ${issueId}`);

    const fetchAll = input.fetchAll === true;
    const effectivePerPage = fetchAll ? (input.perPage ?? DEFAULT_MAX_PER_PAGE) : input.perPage;
    const path = this.buildPath(issueId, input.page, effectivePerPage);

    const first = await this.httpClient.getWithResponse<WorklogWithUnknownFields[]>(path);

    const result = fetchAll
      ? await TrackerPaginator.fetchAllPages<WorklogWithUnknownFields>({
          firstResponse: first,
          requestNext: (p) => this.httpClient.getWithResponse<WorklogWithUnknownFields[]>(p),
          ...(input.maxItems !== undefined ? { maxItems: input.maxItems } : {}),
          ...(effectivePerPage !== undefined ? { perPage: effectivePerPage } : {}),
          ...(budget !== undefined ? { budget } : {}),
        })
      : TrackerPaginator.singlePage<WorklogWithUnknownFields>(first, {
          page: input.page,
          perPage: input.perPage,
        });

    this.logger.info(`Получено ${result.items.length} записей времени для задачи ${issueId}`);

    return result;
  }

  /**
   * Получает записи времени для нескольких задач параллельно
   *
   * @param issueIds - массив идентификаторов задач
   * @param input - параметры пагинации (применяются ко всем задачам)
   * @returns результаты в формате BatchResult с PaginatedResult в value
   * @throws {Error} если количество задач превышает maxBatchSize
   */
  async executeMany(
    issueIds: string[],
    input: GetWorklogsInput = {}
  ): Promise<BatchResult<string, PaginatedResult<WorklogWithUnknownFields>>> {
    if (issueIds.length === 0) {
      this.logger.warn('GetWorklogsOperation: пустой массив идентификаторов');
      return [];
    }

    this.logger.info(
      `Получение записей времени для ${issueIds.length} задач параллельно: ${issueIds.join(', ')}`
    );

    const budget =
      input.fetchAll === true
        ? new ItemBudget(input.maxTotalItems ?? DEFAULT_MAX_TOTAL_ITEMS)
        : undefined;

    const operations = issueIds.map((issueId) => ({
      key: issueId,
      fn: async (): Promise<PaginatedResult<WorklogWithUnknownFields>> =>
        this.execute(issueId, input, budget),
    }));

    return this.parallelExecutor.executeParallel(operations, 'get worklogs');
  }

  /**
   * Построить путь с query-параметрами пагинации.
   */
  private buildPath(issueId: string, page?: number, perPage?: number): string {
    const base = `/v2/issues/${issueId}/worklog`;
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
