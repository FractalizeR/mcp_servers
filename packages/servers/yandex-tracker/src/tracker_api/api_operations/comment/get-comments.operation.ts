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
import { ParallelExecutor } from '@mcp-framework/infrastructure';
import type { GetCommentsInput } from '#tracker_api/dto/index.js';
import type { CommentWithUnknownFields } from '#tracker_api/entities/index.js';
import type { BatchResult } from '@mcp-framework/infrastructure';
import type { ServerConfig } from '#config';

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
   * Получает список комментариев задачи
   *
   * @param issueId - идентификатор или ключ задачи (например, 'QUEUE-123')
   * @param input - параметры запроса (пагинация, expand)
   * @returns массив комментариев
   * @throws {Error} если запрос завершился с ошибкой
   *
   * ВАЖНО:
   * - Retry делается автоматически в HttpClient.get
   * - API возвращает массив комментариев
   * - Поддерживает пагинацию через perPage и page параметры
   */
  async execute(
    issueId: string,
    input: GetCommentsInput = {}
  ): Promise<CommentWithUnknownFields[]> {
    this.logger.info(`Получение комментариев задачи ${issueId}`);

    // Подготовка query параметров
    const queryParams: Record<string, string> = {};
    if (input.perPage !== undefined) {
      queryParams['perPage'] = String(input.perPage);
    }
    if (input.page !== undefined) {
      queryParams['page'] = String(input.page);
    }
    if (input.expand !== undefined) {
      queryParams['expand'] = input.expand;
    }

    // Формирование URL с query параметрами
    const queryString =
      Object.keys(queryParams).length > 0
        ? `?${Object.entries(queryParams)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&')}`
        : '';

    const endpoint = `/v3/issues/${issueId}/comments${queryString}`;

    const comments = await this.httpClient.get<CommentWithUnknownFields[]>(endpoint);

    this.logger.info(
      `Получено ${Array.isArray(comments) ? comments.length : 1} комментариев для задачи ${issueId}`
    );

    return Array.isArray(comments) ? comments : [comments];
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
  ): Promise<BatchResult<string, CommentWithUnknownFields[]>> {
    // Проверка на пустой массив
    if (issueIds.length === 0) {
      this.logger.warn('GetCommentsOperation: пустой массив идентификаторов');
      return [];
    }

    this.logger.info(
      `Получение комментариев для ${issueIds.length} задач параллельно: ${issueIds.join(', ')}`
    );

    // Создаём операции для каждой задачи
    const operations = issueIds.map((issueId) => ({
      key: issueId,
      fn: async (): Promise<CommentWithUnknownFields[]> => {
        // Вызываем существующий метод execute() для каждой задачи
        return this.execute(issueId, input);
      },
    }));

    // Выполняем через ParallelExecutor (централизованный throttling)
    return this.parallelExecutor.executeParallel(operations, 'get comments');
  }
}
