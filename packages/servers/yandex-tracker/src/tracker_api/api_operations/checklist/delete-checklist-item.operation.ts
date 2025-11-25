/**
 * Операция удаления элемента чеклиста
 *
 * Ответственность (SRP):
 * - ТОЛЬКО удаление элемента из чеклиста (single и batch режимы)
 * - Параллельное выполнение через ParallelExecutor (batch режим)
 * - НЕТ добавления/получения/редактирования элементов
 *
 * API: DELETE /v2/issues/{issueId}/checklistItems/{checklistItemId}
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { ParallelExecutor } from '@mcp-framework/infrastructure';
import type { BatchResult } from '@mcp-framework/infrastructure';
import type { ServerConfig } from '#config';

export class DeleteChecklistItemOperation extends BaseOperation {
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
   * Удаляет элемент из чеклиста
   *
   * @param issueId - идентификатор или ключ задачи (например, 'QUEUE-123')
   * @param checklistItemId - идентификатор элемента чеклиста
   * @returns void
   * @throws {Error} если запрос завершился с ошибкой
   *
   * ВАЖНО:
   * - Retry делается автоматически в HttpClient.delete (через deleteRequest)
   * - API не возвращает данные при успешном удалении
   */
  async execute(issueId: string, checklistItemId: string): Promise<void> {
    this.logger.info(`Удаление элемента ${checklistItemId} из чеклиста задачи ${issueId}`);

    await this.deleteRequest<void>(`/v2/issues/${issueId}/checklistItems/${checklistItemId}`);

    this.logger.info(`Элемент ${checklistItemId} чеклиста задачи ${issueId} успешно удалён`);
  }

  /**
   * Удаляет элементы из чеклистов нескольких задач параллельно
   *
   * @param items - массив элементов для удаления с issueId и itemId
   * @returns массив результатов в формате BatchResult
   * @throws {Error} если количество элементов превышает maxBatchSize
   *
   * ВАЖНО:
   * - Каждый элемент имеет свои параметры (issueId, itemId)
   * - Использует ParallelExecutor для соблюдения maxConcurrentRequests
   * - Retry делается автоматически в HttpClient.delete
   */
  async executeMany(
    items: Array<{ issueId: string; itemId: string }>
  ): Promise<BatchResult<string, void>> {
    // Проверка на пустой массив
    if (items.length === 0) {
      this.logger.warn('DeleteChecklistItemOperation: пустой массив элементов');
      return [];
    }

    this.logger.info(
      `Удаление элементов из чеклистов ${items.length} задач параллельно: ${items.map((i) => `${i.issueId}/${i.itemId}`).join(', ')}`
    );

    // Создаём операции для каждой задачи
    // Используем комбинацию issueId/itemId как ключ для идентификации результатов
    const operations = items.map(({ issueId, itemId }) => ({
      key: `${issueId}/${itemId}`,
      fn: async (): Promise<void> => {
        // Вызываем существующий метод execute() для каждого элемента
        return this.execute(issueId, itemId);
      },
    }));

    // Выполняем через ParallelExecutor (централизованный throttling)
    return this.parallelExecutor.executeParallel(operations, 'delete checklist items');
  }
}
