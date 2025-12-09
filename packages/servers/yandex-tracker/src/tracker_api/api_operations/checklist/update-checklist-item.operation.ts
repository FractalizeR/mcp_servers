/**
 * Операция обновления элемента чеклиста
 *
 * Ответственность (SRP):
 * - ТОЛЬКО обновление существующего элемента чеклиста (single и batch режимы)
 * - Параллельное выполнение через ParallelExecutor (batch режим)
 * - НЕТ добавления/получения/удаления элементов
 *
 * API: PATCH /v2/issues/{issueId}/checklistItems/{checklistItemId}
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { ParallelExecutor } from '@fractalizer/mcp-infrastructure';
import type { UpdateChecklistItemInput } from '#tracker_api/dto/index.js';
import type { ChecklistItemWithUnknownFields } from '#tracker_api/entities/index.js';
import type { BatchResult } from '@fractalizer/mcp-infrastructure';
import type { ServerConfig } from '#config';

export class UpdateChecklistItemOperation extends BaseOperation {
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
   * Обновляет элемент чеклиста
   *
   * @param issueId - идентификатор или ключ задачи (например, 'QUEUE-123')
   * @param checklistItemId - идентификатор элемента чеклиста
   * @param input - новые данные элемента
   * @returns обновлённый элемент чеклиста
   * @throws {Error} если запрос завершился с ошибкой
   *
   * ВАЖНО:
   * - Retry делается автоматически в HttpClient.patch
   * - API возвращает полный объект обновлённого элемента
   * - Поддерживает partial update (все поля опциональны)
   */
  async execute(
    issueId: string,
    checklistItemId: string,
    input: UpdateChecklistItemInput
  ): Promise<ChecklistItemWithUnknownFields> {
    this.logger.info(`Обновление элемента ${checklistItemId} чеклиста задачи ${issueId}`);

    const item = await this.httpClient.patch<ChecklistItemWithUnknownFields>(
      `/v2/issues/${issueId}/checklistItems/${checklistItemId}`,
      input
    );

    this.logger.info(`Элемент ${checklistItemId} чеклиста задачи ${issueId} успешно обновлён`);

    return item;
  }

  /**
   * Обновляет элементы чеклистов нескольких задач параллельно
   *
   * @param items - массив элементов с индивидуальными параметрами
   * @returns массив результатов в формате BatchResult
   * @throws {Error} если количество элементов превышает maxBatchSize
   *
   * ВАЖНО:
   * - Каждый элемент имеет свои параметры (issueId, checklistItemId, text?, checked?, assignee?, deadline?)
   * - Использует ParallelExecutor для соблюдения maxConcurrentRequests
   * - Retry делается автоматически в HttpClient.patch
   */
  async executeMany(
    items: Array<{
      issueId: string;
      checklistItemId: string;
      text?: string | undefined;
      checked?: boolean | undefined;
      assignee?: string | undefined;
      deadline?: string | undefined;
    }>
  ): Promise<BatchResult<string, ChecklistItemWithUnknownFields>> {
    // Проверка на пустой массив
    if (items.length === 0) {
      this.logger.warn('UpdateChecklistItemOperation: пустой массив элементов');
      return [];
    }

    this.logger.info(
      `Обновление элементов чеклистов ${items.length} задач параллельно: ${items.map((i) => `${i.issueId}/${i.checklistItemId}`).join(', ')}`
    );

    // Создаём операции для каждого элемента
    const operations = items.map(
      ({ issueId, checklistItemId, text, checked, assignee, deadline }) => ({
        key: `${issueId}/${checklistItemId}`,
        fn: async (): Promise<ChecklistItemWithUnknownFields> => {
          // Вызываем существующий метод execute() для каждого элемента с индивидуальными параметрами
          return this.execute(issueId, checklistItemId, { text, checked, assignee, deadline });
        },
      })
    );

    // Выполняем через ParallelExecutor (централизованный throttling)
    return this.parallelExecutor.executeParallel(operations, 'update checklist items');
  }
}
