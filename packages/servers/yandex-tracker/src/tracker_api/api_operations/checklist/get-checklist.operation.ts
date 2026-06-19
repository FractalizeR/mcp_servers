/**
 * Операция получения чеклиста задачи
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение всех элементов чеклиста задачи
 * - НЕТ добавления/редактирования/удаления элементов
 *
 * API: GET /v2/issues/{issueId}/checklistItems
 *
 * Кеширование: операция кеш НЕ использует (по-прежнему) — кеш-аудит расхождений
 * не выявил.
 */

import { ParallelExecutor } from '@fractalizer/mcp-infrastructure';
import type { BatchResult, QueryParams } from '@fractalizer/mcp-infrastructure';
import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import {
  TrackerPaginator,
  DEFAULT_MAX_PER_PAGE,
} from '#tracker_api/utils/tracker-paginator.util.js';
import { ItemBudget, DEFAULT_MAX_TOTAL_ITEMS } from '#tracker_api/utils/item-budget.util.js';
import type { ChecklistItemWithUnknownFields } from '#tracker_api/entities/index.js';
import type { PaginatedResult } from '#tracker_api/entities/common/index.js';
import type { GetChecklistInput } from '#tracker_api/dto/checklist/get-checklist.dto.js';
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
   * Получает чеклист задачи.
   *
   * @param input - задача + опциональные параметры пагинации
   * @returns `PaginatedResult` с элементами чеклиста и метаданными
   * @throws {Error} если запрос завершился с ошибкой
   *
   * ВАЖНО:
   * - Retry делается автоматически в HttpClient
   * - API возвращает массив элементов чеклиста
   */
  async execute(
    input: GetChecklistInput,
    budget?: ItemBudget
  ): Promise<PaginatedResult<ChecklistItemWithUnknownFields>> {
    const { issueId } = input;
    this.logger.info(`Получение чеклиста задачи ${issueId}`);

    const fetchAll = input.fetchAll === true;
    // В режиме fetchAll поднимаем perPage к рекомендуемому максимуму ради
    // меньшего числа round-trip'ов (maxItems всё равно режет финальную выдачу).
    const effectivePerPage = fetchAll ? (input.perPage ?? DEFAULT_MAX_PER_PAGE) : input.perPage;

    const path = `/v2/issues/${issueId}/checklistItems`;
    const params = this.buildParams(input.page, effectivePerPage);

    const first = await this.httpClient.getWithResponse<ChecklistItemWithUnknownFields[]>(
      path,
      params
    );

    const result = fetchAll
      ? await TrackerPaginator.fetchAllPages<ChecklistItemWithUnknownFields>({
          firstResponse: first,
          requestNext: (p) => this.httpClient.getWithResponse<ChecklistItemWithUnknownFields[]>(p),
          ...(input.maxItems !== undefined ? { maxItems: input.maxItems } : {}),
          ...(effectivePerPage !== undefined ? { perPage: effectivePerPage } : {}),
          ...(budget !== undefined ? { budget } : {}),
          onError: (error, pagesFetched) =>
            this.logger.warn(
              `Частичный отказ при обходе чеклиста задачи ${issueId} ` +
                `после ${pagesFetched} стр.: ${String(error)}`
            ),
        })
      : TrackerPaginator.singlePage<ChecklistItemWithUnknownFields>(first, {
          page: input.page,
          perPage: input.perPage,
        });

    this.logger.info(`Получено ${result.items.length} элементов чеклиста для задачи ${issueId}`);

    return result;
  }

  /**
   * Получает чеклисты для нескольких задач параллельно.
   *
   * @param issueIds - массив идентификаторов или ключей задач
   * @param options - общие параметры пагинации (применяются ко всем задачам)
   * @returns результаты batch-операции с `PaginatedResult` в каждой задаче
   */
  async executeMany(
    issueIds: string[],
    options: Omit<GetChecklistInput, 'issueId'> = {}
  ): Promise<BatchResult<string, PaginatedResult<ChecklistItemWithUnknownFields>>> {
    if (issueIds.length === 0) {
      this.logger.warn('GetChecklistOperation: пустой массив issueIds');
      return [];
    }

    const issuesList = issueIds.join(', ');
    this.logger.info(`Получение чеклистов для ${issueIds.length} задач параллельно: ${issuesList}`);

    const budget =
      options.fetchAll === true
        ? new ItemBudget(options.maxTotalItems ?? DEFAULT_MAX_TOTAL_ITEMS)
        : undefined;

    const operations = issueIds.map((issueId) => ({
      key: issueId,
      fn: async (): Promise<PaginatedResult<ChecklistItemWithUnknownFields>> =>
        this.execute({ issueId, ...options }, budget),
    }));

    return this.parallelExecutor.executeParallel(operations, 'get checklists');
  }

  /**
   * Собирает query-параметры запроса (только заданные значения).
   */
  private buildParams(page?: number, perPage?: number): QueryParams | undefined {
    const params: QueryParams = {};
    if (page !== undefined) {
      params['page'] = page;
    }
    if (perPage !== undefined) {
      params['perPage'] = perPage;
    }
    return Object.keys(params).length > 0 ? params : undefined;
  }
}
