/**
 * Batch-операция получения истории изменений задач (с пагинацией)
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение истории изменений задач (GET /v3/issues/{issueKey}/changelog)
 * - Пагинация истории каждой задачи (single-page по умолчанию / fetchAll)
 * - Параллельное выполнение через ParallelExecutor (с throttling)
 * - Соблюдение maxConcurrentRequests из конфигурации
 * - НЕТ создания/обновления/удаления
 *
 * Документация Python SDK:
 * - yandex_tracker_client/collections.py:638 - changelog property
 * - yandex_tracker_client/collections.py:1073 - IssueChangelog collection
 *
 * API v3: GET /v3/issues/{issueKey}/changelog
 *
 * ВАЖНО: ранее операция не поддерживала пагинацию вовсе (возвращался только
 * первый ответ API без обхода `Link rel="next"`) — это приводило к молчаливой
 * потере части истории у задач с длинной историей. Теперь:
 * - по умолчанию (`fetchAll` не задан) — одна страница + метаданные пагинации;
 * - `fetchAll=true` — полный обход всех страниц с защитным лимитом maxItems.
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { ParallelExecutor } from '@fractalizer/mcp-infrastructure';
import {
  TrackerPaginator,
  DEFAULT_MAX_PER_PAGE,
  ItemBudget,
  DEFAULT_MAX_TOTAL_ITEMS,
  CursorCodec,
  CURSOR_TAGS,
} from '#tracker_api/utils/index.js';
import type { ChangelogEntryWithUnknownFields } from '#tracker_api/entities/index.js';
import type { PaginatedResult } from '#tracker_api/entities/common/index.js';
import type { GetIssueChangelogInputDto } from '#tracker_api/dto/issue/get-issue-changelog-input.dto.js';
import type { BatchResult } from '@fractalizer/mcp-infrastructure';
import type { ServerConfig } from '#config';

/**
 * Результат batch-операции для changelog
 *
 * Generic параметры:
 * - TKey = string (issueKey: 'QUEUE-123')
 * - TValue = PaginatedResult<ChangelogEntryWithUnknownFields> (страница истории + метаданные)
 */
export type BatchChangelogResult = BatchResult<
  string,
  PaginatedResult<ChangelogEntryWithUnknownFields>
>[number];

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
   * Получает историю изменений нескольких задач параллельно с контролем concurrency.
   *
   * @param issueKeys - массив ключей задач (например, ['QUEUE-123', 'QUEUE-456'])
   * @param input - общие для всех задач параметры пагинации (page/perPage/fetchAll/maxItems)
   * @returns массив результатов (fulfilled | rejected) в том же порядке, что и входные ключи;
   *   каждое значение — `PaginatedResult` со страницей истории и метаданными пагинации
   * @throws {Error} если количество ключей превышает maxBatchSize (валидация в ParallelExecutor)
   *
   * ВАЖНО:
   * - Использует ParallelExecutor → соблюдается maxConcurrentRequests
   * - Retry делается ТОЛЬКО в HttpClient (нет двойного retry)
   * - История возвращается в хронологическом порядке (от старых к новым)
   * - Кеширование НЕ используется (история может часто меняться)
   */
  async execute(
    issueKeys: string[],
    input: GetIssueChangelogInputDto = {}
  ): Promise<BatchChangelogResult[]> {
    // Проверка на пустой массив
    if (issueKeys.length === 0) {
      this.logger.warn('GetIssueChangelogOperation: пустой массив ключей');
      return [];
    }

    this.logger.info(
      `Получение истории изменений для ${issueKeys.length} задач: ${issueKeys.join(', ')}`
    );

    // Общий бюджет записей на весь batch-ответ (только в режиме fetchAll).
    const budget =
      input.fetchAll === true
        ? new ItemBudget(input.maxTotalItems ?? DEFAULT_MAX_TOTAL_ITEMS)
        : undefined;

    // Создаём операции без кеширования (история часто меняется)
    const operations = issueKeys.map((issueKey) => ({
      key: issueKey,
      fn: (): Promise<PaginatedResult<ChangelogEntryWithUnknownFields>> =>
        this.fetchChangelog(issueKey, input, budget),
    }));

    // Выполняем через ParallelExecutor (централизованный throttling)
    return this.parallelExecutor.executeParallel(operations, 'get issue changelog');
  }

  /**
   * Получить историю изменений одной задачи с пагинацией.
   *
   * Паттерн single/fetchAll: при fetchAll=true обход всех страниц по
   * `Link rel="next"`; иначе — одна страница + метаданные.
   */
  private async fetchChangelog(
    issueKey: string,
    input: GetIssueChangelogInputDto,
    budget?: ItemBudget
  ): Promise<PaginatedResult<ChangelogEntryWithUnknownFields>> {
    // Курсор: один запрос по декодированному пути (perPage уже в нём).
    if (input.cursor !== undefined) {
      const { path } = CursorCodec.decodeForIssue(input.cursor, CURSOR_TAGS.changelog, issueKey);
      const response =
        await this.httpClient.getWithResponse<ChangelogEntryWithUnknownFields[]>(path);
      const single = TrackerPaginator.singlePage(response, { tag: CURSOR_TAGS.changelog });
      this.logger.debug(
        `История изменений для ${issueKey} (cursor): ${single.items.length} записей`
      );
      return single;
    }

    // В режиме fetchAll поднимаем perPage к рекомендуемому максимуму (меньше round-trip'ов).
    const effectivePerPage =
      input.fetchAll === true ? (input.perPage ?? DEFAULT_MAX_PER_PAGE) : input.perPage;

    const path = this.buildPath(issueKey, {
      ...(effectivePerPage !== undefined ? { perPage: effectivePerPage } : {}),
    });

    const first = await this.httpClient.getWithResponse<ChangelogEntryWithUnknownFields[]>(path);

    if (input.fetchAll !== true) {
      const single = TrackerPaginator.singlePage(first, {
        tag: CURSOR_TAGS.changelog,
        ...(effectivePerPage !== undefined ? { perPage: effectivePerPage } : {}),
      });
      this.logger.debug(`История изменений для ${issueKey}: ${single.items.length} записей`);
      return single;
    }

    const all = await TrackerPaginator.fetchAllPages({
      firstResponse: first,
      requestNext: (p) => this.httpClient.getWithResponse<ChangelogEntryWithUnknownFields[]>(p),
      tag: CURSOR_TAGS.changelog,
      ...(input.maxItems !== undefined ? { maxItems: input.maxItems } : {}),
      ...(effectivePerPage !== undefined ? { perPage: effectivePerPage } : {}),
      ...(budget !== undefined ? { budget } : {}),
      onError: (error, pagesFetched) =>
        this.logger.warn(`Частичный отказ при обходе истории ${issueKey}`, {
          error,
          pagesFetched,
        }),
    });

    this.logger.debug(
      `История изменений для ${issueKey}: ${all.items.length} записей (страниц: ${all.pagination.pagesFetched})`
    );
    return all;
  }

  /**
   * Сформировать path `/v3/issues/{issueKey}/changelog` с query-параметрами.
   */
  private buildPath(issueKey: string, opts: { perPage?: number | undefined }): string {
    const queryParams: Record<string, string> = {};
    if (opts.perPage !== undefined) {
      queryParams['perPage'] = String(opts.perPage);
    }

    const queryString =
      Object.keys(queryParams).length > 0
        ? `?${Object.entries(queryParams)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&')}`
        : '';

    return `/v3/issues/${issueKey}/changelog${queryString}`;
  }
}
