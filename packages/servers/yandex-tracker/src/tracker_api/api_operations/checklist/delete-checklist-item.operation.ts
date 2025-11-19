/**
 * Операция удаления элемента чеклиста
 *
 * Ответственность (SRP):
 * - ТОЛЬКО удаление элемента из чеклиста
 * - НЕТ добавления/получения/редактирования элементов
 *
 * API: DELETE /v2/issues/{issueId}/checklistItems/{checklistItemId}
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';

export class DeleteChecklistItemOperation extends BaseOperation {
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
}
