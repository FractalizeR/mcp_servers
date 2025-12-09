/**
 * Операция редактирования комментария
 *
 * Ответственность (SRP):
 * - ТОЛЬКО редактирование существующего комментария
 * - НЕТ добавления/получения/удаления комментариев
 *
 * API: PATCH /v3/issues/{issueId}/comments/{commentId}
 */

import { ParallelExecutor } from '@fractalizer/mcp-infrastructure';
import type { BatchResult } from '@fractalizer/mcp-infrastructure';
import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import type { EditCommentInput } from '#tracker_api/dto/index.js';
import type { CommentWithUnknownFields } from '#tracker_api/entities/index.js';
import type { ServerConfig } from '#config';

export class EditCommentOperation extends BaseOperation {
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
   * Редактирует комментарий
   *
   * @param issueId - идентификатор или ключ задачи (например, 'QUEUE-123')
   * @param commentId - идентификатор комментария
   * @param input - новые данные комментария
   * @returns обновлённый комментарий
   * @throws {Error} если запрос завершился с ошибкой
   *
   * ВАЖНО:
   * - Retry делается автоматически в HttpClient.patch
   * - API возвращает полный объект обновлённого комментария
   */
  async execute(
    issueId: string,
    commentId: string,
    input: EditCommentInput
  ): Promise<CommentWithUnknownFields> {
    this.logger.info(`Редактирование комментария ${commentId} задачи ${issueId}`);

    const comment = await this.httpClient.patch<CommentWithUnknownFields>(
      `/v3/issues/${issueId}/comments/${commentId}`,
      input
    );

    this.logger.info(`Комментарий ${commentId} задачи ${issueId} успешно обновлён`);

    return comment;
  }

  /**
   * Редактирует несколько комментариев параллельно
   *
   * @param comments - массив комментариев для редактирования
   * @returns результаты batch-операции
   */
  async executeMany(
    comments: Array<{ issueId: string; commentId: string; text: string }>
  ): Promise<BatchResult<string, CommentWithUnknownFields>> {
    if (comments.length === 0) {
      this.logger.warn('EditCommentOperation: пустой массив комментариев');
      return [];
    }

    const commentsList = comments
      .map(({ issueId, commentId }) => `${issueId}/${commentId}`)
      .join(', ');
    this.logger.info(`Редактирование ${comments.length} комментариев параллельно: ${commentsList}`);

    const operations = comments.map(({ issueId, commentId, text }) => ({
      key: `${issueId}:${commentId}`,
      fn: async (): Promise<CommentWithUnknownFields> => this.execute(issueId, commentId, { text }),
    }));

    return this.parallelExecutor.executeParallel(operations, 'edit comments');
  }
}
