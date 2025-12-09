/**
 * Операция добавления элемента в чеклист задачи
 *
 * Ответственность (SRP):
 * - ТОЛЬКО добавление нового элемента в чеклист (single и batch режимы)
 * - Параллельное выполнение через ParallelExecutor (batch режим)
 * - НЕТ получения/редактирования/удаления элементов
 *
 * API: POST /v2/issues/{issueId}/checklistItems
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { ParallelExecutor } from '@fractalizer/mcp-infrastructure';
import type { AddChecklistItemInput } from '#tracker_api/dto/index.js';
import type { ChecklistItemWithUnknownFields } from '#tracker_api/entities/index.js';
import type { BatchResult } from '@fractalizer/mcp-infrastructure';
import type { ServerConfig } from '#config';

export class AddChecklistItemOperation extends BaseOperation {
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
   * Добавляет элемент в чеклист задачи
   *
   * @param issueId - идентификатор или ключ задачи (например, 'QUEUE-123')
   * @param input - данные нового элемента чеклиста
   * @returns созданный элемент чеклиста
   * @throws {Error} если запрос завершился с ошибкой
   *
   * ВАЖНО:
   * - Retry делается автоматически в HttpClient.post
   * - API возвращает полный объект созданного элемента
   */
  async execute(
    issueId: string,
    input: AddChecklistItemInput
  ): Promise<ChecklistItemWithUnknownFields> {
    this.logger.info(`Добавление элемента в чеклист задачи ${issueId}`);

    const item = await this.httpClient.post<ChecklistItemWithUnknownFields>(
      `/v2/issues/${issueId}/checklistItems`,
      input
    );

    this.logger.info(`Элемент успешно добавлен в чеклист задачи ${issueId}: ${item.id}`);

    return item;
  }

  /**
   * Добавляет элементы в чеклисты нескольких задач параллельно
   *
   * @param items - массив элементов с индивидуальными параметрами
   * @returns массив результатов в формате BatchResult
   * @throws {Error} если количество элементов превышает maxBatchSize
   *
   * ВАЖНО:
   * - Каждая задача имеет свои параметры (text, checked, assignee, deadline)
   * - Использует ParallelExecutor для соблюдения maxConcurrentRequests
   * - Retry делается автоматически в HttpClient.post
   */
  async executeMany(
    items: Array<{
      issueId: string;
      text: string;
      checked?: boolean | undefined;
      assignee?: string | undefined;
      deadline?: string | undefined;
    }>
  ): Promise<BatchResult<string, ChecklistItemWithUnknownFields>> {
    // Проверка на пустой массив
    if (items.length === 0) {
      this.logger.warn('AddChecklistItemOperation: пустой массив элементов');
      return [];
    }

    this.logger.info(
      `Добавление элементов в чеклисты ${items.length} задач параллельно: ${items.map((i) => i.issueId).join(', ')}`
    );

    // Создаём операции для каждой задачи
    const operations = items.map(({ issueId, text, checked, assignee, deadline }) => ({
      key: issueId,
      fn: async (): Promise<ChecklistItemWithUnknownFields> => {
        // Вызываем существующий метод execute() для каждой задачи с индивидуальными параметрами
        return this.execute(issueId, { text, checked, assignee, deadline });
      },
    }));

    // Выполняем через ParallelExecutor (централизованный throttling)
    return this.parallelExecutor.executeParallel(operations, 'add checklist items');
  }
}
