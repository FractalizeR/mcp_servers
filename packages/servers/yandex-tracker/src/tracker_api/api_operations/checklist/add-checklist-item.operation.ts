/**
 * Операция добавления элемента в чеклист задачи
 *
 * Ответственность (SRP):
 * - ТОЛЬКО добавление нового элемента в чеклист
 * - НЕТ получения/редактирования/удаления элементов
 *
 * API: POST /v2/issues/{issueId}/checklistItems
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';
import type { AddChecklistItemInput } from '@tracker_api/dto/index.js';
import type { ChecklistItemWithUnknownFields } from '@tracker_api/entities/index.js';

export class AddChecklistItemOperation extends BaseOperation {
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
}
