/**
 * Операция удаления комментария
 *
 * Ответственность (SRP):
 * - ТОЛЬКО удаление комментария (single и batch режимы)
 * - Параллельное выполнение через ParallelExecutor (batch режим)
 * - НЕТ добавления/получения/редактирования комментариев
 *
 * API: DELETE /v3/issues/{issueId}/comments/{commentId}
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { ParallelExecutor } from '@mcp-framework/infrastructure';
import type { BatchResult } from '@mcp-framework/infrastructure';
import type { ServerConfig } from '#config';

export class DeleteCommentOperation extends BaseOperation {
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
   * Удаляет комментарий
   *
   * @param issueId - идентификатор или ключ задачи (например, 'QUEUE-123')
   * @param commentId - идентификатор комментария
   * @returns void
   * @throws {Error} если запрос завершился с ошибкой
   *
   * ВАЖНО:
   * - Retry делается автоматически в HttpClient.delete (через deleteRequest)
   * - API не возвращает данные при успешном удалении
   */
  async execute(issueId: string, commentId: string): Promise<void> {
    this.logger.info(`Удаление комментария ${commentId} задачи ${issueId}`);

    await this.deleteRequest<void>(`/v3/issues/${issueId}/comments/${commentId}`);

    this.logger.info(`Комментарий ${commentId} задачи ${issueId} успешно удалён`);
  }

  /**
   * Удаляет комментарии из нескольких задач параллельно
   *
   * @param comments - массив комментариев для удаления с индивидуальными параметрами
   * @returns массив результатов в формате BatchResult
   * @throws {Error} если количество задач превышает maxBatchSize
   *
   * ВАЖНО:
   * - Каждая задача имеет свои параметры (issueId, commentId)
   * - Использует ParallelExecutor для соблюдения maxConcurrentRequests
   * - Retry делается автоматически в HttpClient.delete
   * - Для DELETE операций возвращаем void, key - уникальная комбинация issueId+commentId
   */
  async executeMany(
    comments: Array<{ issueId: string; commentId: string }>
  ): Promise<BatchResult<string, void>> {
    // Проверка на пустой массив
    if (comments.length === 0) {
      this.logger.warn('DeleteCommentOperation: пустой массив комментариев');
      return [];
    }

    this.logger.info(
      `Удаление ${comments.length} комментариев параллельно: ${comments.map((c) => `${c.issueId}/${c.commentId}`).join(', ')}`
    );

    // Создаём операции для каждого комментария
    const operations = comments.map(({ issueId, commentId }) => ({
      // Уникальный ключ: комбинация issueId + commentId
      key: `${issueId}:${commentId}`,
      fn: async (): Promise<void> => {
        // Вызываем существующий метод execute() для каждого комментария
        return this.execute(issueId, commentId);
      },
    }));

    // Выполняем через ParallelExecutor (централизованный throttling)
    return this.parallelExecutor.executeParallel(operations, 'delete comments');
  }
}
