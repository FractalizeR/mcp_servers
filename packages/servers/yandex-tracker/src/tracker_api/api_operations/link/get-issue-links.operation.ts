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
import {
  TrackerPaginator,
  DEFAULT_MAX_PER_PAGE,
  DEFAULT_PER_PAGE,
  ItemBudget,
  DEFAULT_MAX_TOTAL_ITEMS,
  CursorCodec,
  CURSOR_TAGS,
} from '#tracker_api/utils/index.js';
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

    const hasPaginationParams =
      input.cursor !== undefined ||
      input.perPage !== undefined ||
      input.fetchAll !== undefined ||
      input.maxItems !== undefined;

    // Общий бюджет записей на весь batch-ответ (только в режиме fetchAll).
    const budget =
      input.fetchAll === true
        ? new ItemBudget(input.maxTotalItems ?? DEFAULT_MAX_TOTAL_ITEMS)
        : undefined;

    // Создаём операции для каждой задачи. Кеш применяем только к «базовому»
    // запросу без пагинационных параметров, под каноническим ключом
    // ${issueId}/links — его инвалидируют create/delete-link. Иначе суффиксный
    // ключ не попал бы под exact-key delete (stale cache).
    const operations = issueIds.map((issueId) => ({
      key: issueId,
      fn: async (): Promise<PaginatedResult<LinkWithUnknownFields>> => {
        if (!hasPaginationParams) {
          const cacheKey = EntityCacheKey.createKey(EntityType.ISSUE, `${issueId}/links`);
          return this.withCache(cacheKey, async () => this.fetch(issueId, input, budget));
        }

        return this.fetch(issueId, input, budget);
      },
    }));

    // Выполняем через ParallelExecutor (централизованный throttling)
    return this.parallelExecutor.executeParallel(operations, 'get issue links');
  }

  /**
   * Выполнить HTTP-запрос(ы) и собрать `PaginatedResult` для одной задачи (без кеша).
   */
  private async fetch(
    issueId: string,
    input: GetIssueLinksInput,
    budget?: ItemBudget
  ): Promise<PaginatedResult<LinkWithUnknownFields>> {
    // Курсор-режим: декодируем путь следующей страницы и отдаём ровно одну
    // страницу (размер уже зашит в курсор). При битом/чужом курсоре decode
    // бросает InvalidCursorError (доходит до агента как explicit-ошибка).
    if (input.cursor !== undefined) {
      const { path } = CursorCodec.decodeForIssue(input.cursor, CURSOR_TAGS.links, issueId);
      const resp = await this.httpClient.getWithResponse<LinkWithUnknownFields[]>(path);
      const cursorPerPage = TrackerPaginator.perPageFromPath(path);
      const result = TrackerPaginator.singlePage<LinkWithUnknownFields>(resp, {
        tag: CURSOR_TAGS.links,
        ...(cursorPerPage !== undefined ? { perPage: cursorPerPage } : {}),
      });
      this.logger.debug(`Получено ${result.items.length} связей для задачи ${issueId} (cursor)`);
      return result;
    }

    const fetchAll = input.fetchAll === true;
    // Вне fetchAll — НАШ явный дефолт DEFAULT_PER_PAGE (см. JSDoc константы),
    // чтобы perPage всегда был известен buildMeta (F3-sanity-check).
    const effectivePerPage = input.perPage ?? (fetchAll ? DEFAULT_MAX_PER_PAGE : DEFAULT_PER_PAGE);

    const path = this.buildPath(issueId, effectivePerPage);
    const first = await this.httpClient.getWithResponse<LinkWithUnknownFields[]>(path);

    const result = fetchAll
      ? await TrackerPaginator.fetchAllPages<LinkWithUnknownFields>({
          firstResponse: first,
          requestNext: (p) => this.httpClient.getWithResponse<LinkWithUnknownFields[]>(p),
          tag: CURSOR_TAGS.links,
          ...(input.maxItems !== undefined ? { maxItems: input.maxItems } : {}),
          perPage: effectivePerPage,
          ...(budget !== undefined ? { budget } : {}),
        })
      : TrackerPaginator.singlePage<LinkWithUnknownFields>(first, {
          tag: CURSOR_TAGS.links,
          perPage: effectivePerPage,
        });

    this.logger.debug(`Получено ${result.items.length} связей для задачи ${issueId}`);

    return result;
  }

  /**
   * Построить путь первой страницы с query-параметром perPage.
   */
  private buildPath(issueId: string, perPage?: number): string {
    const base = `/v3/issues/${issueId}/links`;
    const query = new URLSearchParams();
    if (perPage !== undefined) {
      query.set('perPage', String(perPage));
    }
    const qs = query.toString();
    return qs.length > 0 ? `${base}?${qs}` : base;
  }
}
