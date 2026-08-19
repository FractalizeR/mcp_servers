/**
 * Операция получения списка комментариев задачи
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение комментариев задачи (single и batch режимы)
 * - Поддержка пагинации
 * - Параллельное выполнение через ParallelExecutor (batch режим)
 * - НЕТ добавления/редактирования/удаления комментариев
 *
 * API: GET /v3/issues/{issueId}/comments
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { ParallelExecutor } from '@fractalizer/mcp-infrastructure';
import {
  TrackerPaginator,
  ItemBudget,
  DEFAULT_MAX_TOTAL_ITEMS,
  DEFAULT_PER_PAGE,
  CursorCodec,
  CURSOR_TAGS,
} from '#tracker_api/utils/index.js';
import type { GetCommentsInput } from '#tracker_api/dto/index.js';
import type { CommentWithUnknownFields } from '#tracker_api/entities/index.js';
import type { PaginatedResult } from '#tracker_api/entities/index.js';
import type { BatchResult, HttpResponseEnvelope } from '@fractalizer/mcp-infrastructure';
import type { ServerConfig } from '#config';

/** Максимум `perPage` для endpoint'а комментариев (v3 допускает до 500). */
const COMMENTS_MAX_PER_PAGE = 500;

export class GetCommentsOperation extends BaseOperation {
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
   * Получает список комментариев задачи с метаданными пагинации
   *
   * @param issueId - идентификатор или ключ задачи (например, 'QUEUE-123')
   * @param input - параметры запроса (пагинация, expand, fetchAll, maxItems)
   * @returns страница комментариев + метаданные пагинации
   * @throws {Error} если запрос завершился с ошибкой
   *
   * ВАЖНО:
   * - Retry делается автоматически в HttpClient.getWithResponse
   * - По умолчанию — одна страница + метаданные (агент листает через pagination.nextCursor)
   * - При fetchAll=true — полный обход по Link rel="next" с защитным лимитом maxItems
   * - API возвращает массив комментариев; нормализуем не-массив к массиву
   */
  async execute(
    issueId: string,
    input: GetCommentsInput = {},
    budget?: ItemBudget
  ): Promise<PaginatedResult<CommentWithUnknownFields>> {
    this.logger.info(`Получение комментариев задачи ${issueId}`);

    // Курсор: один запрос по декодированному пути (perPage/expand уже в нём).
    // perPage на этой странице извлекаем из самого пути (его туда положила
    // первая страница явно, см. DEFAULT_PER_PAGE) — иначе buildMeta не смог
    // бы применить sanity-проверку (F3) ко 2-й и последующим страницам.
    if (input.cursor !== undefined) {
      const { path } = CursorCodec.decodeForIssue(input.cursor, CURSOR_TAGS.comments, issueId);
      const response = await this.httpClient.getWithResponse<CommentWithUnknownFields[]>(path);
      const normalizedCursor = this.normalizeEnvelope(response);
      const cursorPerPage = TrackerPaginator.perPageFromPath(path);
      const single = TrackerPaginator.singlePage<CommentWithUnknownFields>(normalizedCursor, {
        tag: CURSOR_TAGS.comments,
        ...(cursorPerPage !== undefined ? { perPage: cursorPerPage } : {}),
      });
      this.logger.info(
        `Получено ${single.items.length} комментариев для задачи ${issueId} (cursor)`
      );
      return single;
    }

    // В fetchAll perPage поднимаем к максимуму endpoint'а (comments допускает
    // до 500) ради меньшего числа round-trip'ов; maxItems всё равно режет
    // финальную выдачу. Вне fetchAll — НАШ явный дефолт DEFAULT_PER_PAGE
    // (см. JSDoc константы), чтобы perPage всегда был известен buildMeta
    // (F3-sanity-check) — без этого get_comments без явного perPage ложно
    // держит hasNextPage=true даже на единственном элементе (план 3.3/3.4).
    const effectivePerPage =
      input.perPage ?? (input.fetchAll === true ? COMMENTS_MAX_PER_PAGE : DEFAULT_PER_PAGE);

    const path = this.buildPath(issueId, {
      perPage: effectivePerPage,
      expand: input.expand,
    });

    const first = await this.httpClient.getWithResponse<CommentWithUnknownFields[]>(path);

    // Нормализация: API может вернуть один объект вместо массива.
    const normalized = this.normalizeEnvelope(first);

    const result =
      input.fetchAll === true
        ? await TrackerPaginator.fetchAllPages<CommentWithUnknownFields>({
            firstResponse: normalized,
            requestNext: async (p) =>
              this.normalizeEnvelope(
                await this.httpClient.getWithResponse<CommentWithUnknownFields[]>(p)
              ),
            tag: CURSOR_TAGS.comments,
            ...(input.maxItems !== undefined ? { maxItems: input.maxItems } : {}),
            perPage: effectivePerPage,
            ...(budget !== undefined ? { budget } : {}),
            onError: (error, pagesFetched) => {
              this.logger.warn(
                `Частичный отказ при обходе комментариев задачи ${issueId} ` +
                  `(загружено страниц: ${pagesFetched}): ${String(error)}`
              );
            },
          })
        : TrackerPaginator.singlePage<CommentWithUnknownFields>(normalized, {
            tag: CURSOR_TAGS.comments,
            perPage: effectivePerPage,
          });

    this.logger.info(`Получено ${result.items.length} комментариев для задачи ${issueId}`);

    return result;
  }

  /**
   * Собрать относительный путь эндпоинта с query-параметрами.
   */
  private buildPath(
    issueId: string,
    params: { perPage?: number | undefined; expand?: string | undefined }
  ): string {
    const queryParams: Record<string, string> = {};
    if (params.perPage !== undefined) {
      queryParams['perPage'] = String(params.perPage);
    }
    if (params.expand !== undefined) {
      queryParams['expand'] = params.expand;
    }

    const queryString =
      Object.keys(queryParams).length > 0
        ? `?${Object.entries(queryParams)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&')}`
        : '';

    return `/v3/issues/${issueId}/comments${queryString}`;
  }

  /**
   * Нормализовать конверт ответа: API может вернуть один объект вместо массива.
   */
  private normalizeEnvelope(
    envelope: HttpResponseEnvelope<CommentWithUnknownFields[]>
  ): HttpResponseEnvelope<CommentWithUnknownFields[]> {
    if (Array.isArray(envelope.data)) {
      return envelope;
    }
    return { data: [envelope.data], headers: envelope.headers };
  }

  /**
   * Получает комментарии для нескольких задач параллельно
   *
   * @param issueIds - массив идентификаторов задач
   * @param input - параметры запроса (применяются ко всем задачам)
   * @returns массив результатов в формате BatchResult
   * @throws {Error} если количество задач превышает maxBatchSize
   *
   * ВАЖНО:
   * - Параметры perPage, page, expand применяются ко всем задачам одинаково
   * - Использует ParallelExecutor для соблюдения maxConcurrentRequests
   * - Retry делается автоматически в HttpClient.get
   */
  async executeMany(
    issueIds: string[],
    input: GetCommentsInput = {}
  ): Promise<BatchResult<string, PaginatedResult<CommentWithUnknownFields>>> {
    // Проверка на пустой массив
    if (issueIds.length === 0) {
      this.logger.warn('GetCommentsOperation: пустой массив идентификаторов');
      return [];
    }

    this.logger.info(
      `Получение комментариев для ${issueIds.length} задач параллельно: ${issueIds.join(', ')}`
    );

    // Общий бюджет записей на весь batch-ответ (только в режиме fetchAll).
    const budget =
      input.fetchAll === true
        ? new ItemBudget(input.maxTotalItems ?? DEFAULT_MAX_TOTAL_ITEMS)
        : undefined;

    // Создаём операции для каждой задачи
    const operations = issueIds.map((issueId) => ({
      key: issueId,
      fn: async (): Promise<PaginatedResult<CommentWithUnknownFields>> => {
        // Вызываем существующий метод execute() для каждой задачи
        return this.execute(issueId, input, budget);
      },
    }));

    // Выполняем через ParallelExecutor (централизованный throttling)
    return this.parallelExecutor.executeParallel(operations, 'get comments');
  }
}
