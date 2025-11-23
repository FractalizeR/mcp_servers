/**
 * Операция добавления комментария к задаче
 *
 * Ответственность (SRP):
 * - ТОЛЬКО добавление комментария к задаче (single и batch режимы)
 * - Параллельное выполнение через ParallelExecutor (batch режим)
 * - НЕТ получения/редактирования/удаления комментариев
 *
 * API: POST /v3/issues/{issueId}/comments
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { ParallelExecutor } from '@mcp-framework/infrastructure';
import type { AddCommentInput } from '#tracker_api/dto/index.js';
import type { CommentWithUnknownFields } from '#tracker_api/entities/index.js';
import type { BatchResult } from '@mcp-framework/infrastructure';
import type { ServerConfig } from '#config';

export class AddCommentOperation extends BaseOperation {
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
   * Добавляет комментарий к задаче
   *
   * @param issueId - идентификатор или ключ задачи (например, 'QUEUE-123')
   * @param input - данные комментария
   * @returns созданный комментарий
   * @throws {Error} если запрос завершился с ошибкой
   *
   * ВАЖНО:
   * - Retry делается автоматически в HttpClient.post
   * - API возвращает полный объект комментария
   */
  async execute(issueId: string, input: AddCommentInput): Promise<CommentWithUnknownFields> {
    this.logger.info(`Добавление комментария к задаче ${issueId}`);

    const comment = await this.httpClient.post<CommentWithUnknownFields>(
      `/v3/issues/${issueId}/comments`,
      input
    );

    this.logger.info(`Комментарий успешно добавлен к задаче ${issueId}: ${comment.id}`);

    return comment;
  }

  /**
   * Добавляет комментарии к нескольким задачам параллельно
   *
   * @param comments - массив комментариев с индивидуальными параметрами
   * @returns массив результатов в формате BatchResult
   * @throws {Error} если количество задач превышает maxBatchSize
   *
   * ВАЖНО:
   * - Каждая задача имеет свои параметры (text, attachmentIds)
   * - Использует ParallelExecutor для соблюдения maxConcurrentRequests
   * - Retry делается автоматически в HttpClient.post
   */
  async executeMany(
    comments: Array<{ issueId: string; text: string; attachmentIds?: string[] | undefined }>
  ): Promise<BatchResult<string, CommentWithUnknownFields>> {
    // Проверка на пустой массив
    if (comments.length === 0) {
      this.logger.warn('AddCommentOperation: пустой массив комментариев');
      return [];
    }

    this.logger.info(
      `Добавление комментариев к ${comments.length} задачам параллельно: ${comments.map((c) => c.issueId).join(', ')}`
    );

    // Создаём операции для каждой задачи
    const operations = comments.map(({ issueId, text, attachmentIds }) => ({
      key: issueId,
      fn: async (): Promise<CommentWithUnknownFields> => {
        // Вызываем существующий метод execute() для каждой задачи с индивидуальными параметрами
        return this.execute(issueId, { text, attachmentIds });
      },
    }));

    // Выполняем через ParallelExecutor (централизованный throttling)
    return this.parallelExecutor.executeParallel(operations, 'add comments');
  }
}
