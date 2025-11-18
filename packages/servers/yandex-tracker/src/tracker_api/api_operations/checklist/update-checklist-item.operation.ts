/**
 * Операция обновления элемента чеклиста
 *
 * Ответственность (SRP):
 * - ТОЛЬКО обновление существующего элемента чеклиста
 * - НЕТ добавления/получения/удаления элементов
 *
 * API: PATCH /v2/issues/{issueId}/checklistItems/{checklistItemId}
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';
import type { UpdateChecklistItemInput } from '@tracker_api/dto/index.js';
import type { ChecklistItemWithUnknownFields } from '@tracker_api/entities/index.js';

export class UpdateChecklistItemOperation extends BaseOperation {
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

    try {
      const item = await this.httpClient.patch<ChecklistItemWithUnknownFields>(
        `/v2/issues/${issueId}/checklistItems/${checklistItemId}`,
        input
      );

      this.logger.info(`Элемент ${checklistItemId} чеклиста задачи ${issueId} успешно обновлён`);

      return item;
    } catch (error) {
      this.logger.error(
        `Ошибка при обновлении элемента ${checklistItemId} чеклиста задачи ${issueId}:`,
        error
      );
      throw error;
    }
  }
}
