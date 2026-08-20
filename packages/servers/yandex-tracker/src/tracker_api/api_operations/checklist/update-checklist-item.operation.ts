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
import { buildChecklistItemBody } from '#tracker_api/api_operations/checklist/checklist-item-body.util.js';
import type { UpdateChecklistItemInput } from '#tracker_api/dto/index.js';
import type { ChecklistItemWithUnknownFields } from '#tracker_api/entities/index.js';
import type { BatchResult } from '@fractalizer/mcp-infrastructure';
import type { ServerConfig } from '#config';

/**
 * Ответ API v2 на PATCH /v2/issues/{id}/checklistItems/{itemId}: возвращается
 * ОБНОВЛЁННАЯ задача (issue), а не обновлённый элемент — тот лежит в массиве
 * `checklistItems` этой задачи. Тот же капкан, что и у POST (см.
 * `add-checklist-item.operation.ts`).
 */
interface UpdateChecklistItemResponse {
  readonly checklistItems?: ChecklistItemWithUnknownFields[];
}

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
   * - API возвращает задачу целиком, обновлённый элемент ищется в
   *   `checklistItems` по его id (поймано живой пробой: инструмент отдавал
   *   агенту id ЗАДАЧИ вместо id элемента и терял text/checked/deadline)
   * - Поддерживает partial update (все поля опциональны)
   */
  async execute(
    issueId: string,
    checklistItemId: string,
    input: UpdateChecklistItemInput
  ): Promise<ChecklistItemWithUnknownFields> {
    this.logger.info(`Обновление элемента ${checklistItemId} чеклиста задачи ${issueId}`);

    const response = await this.httpClient.patch<UpdateChecklistItemResponse>(
      `/v2/issues/${issueId}/checklistItems/${checklistItemId}`,
      buildChecklistItemBody(input)
    );

    const updated = (response.checklistItems ?? []).find(
      (item) => String(item.id) === checklistItemId
    );
    if (updated === undefined) {
      throw new Error(
        `API не вернул обновлённый элемент ${checklistItemId} в чеклисте задачи ${issueId}`
      );
    }

    this.logger.info(`Элемент ${checklistItemId} чеклиста задачи ${issueId} успешно обновлён`);

    return updated;
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
