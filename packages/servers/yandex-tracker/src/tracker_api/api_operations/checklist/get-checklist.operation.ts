/**
 * Операция получения чеклиста задачи
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение всех элементов чеклиста задачи
 * - НЕТ добавления/редактирования/удаления элементов
 *
 * API: GET /v2/issues/{issueId}/checklistItems
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';
import type { ChecklistItemWithUnknownFields } from '@tracker_api/entities/index.js';

export class GetChecklistOperation extends BaseOperation {
  /**
   * Получает чеклист задачи
   *
   * @param issueId - идентификатор или ключ задачи (например, 'QUEUE-123')
   * @returns массив элементов чеклиста
   * @throws {Error} если запрос завершился с ошибкой
   *
   * ВАЖНО:
   * - Retry делается автоматически в HttpClient.get
   * - API возвращает массив элементов чеклиста
   */
  async execute(issueId: string): Promise<ChecklistItemWithUnknownFields[]> {
    this.logger.info(`Получение чеклиста задачи ${issueId}`);

    const checklist = await this.httpClient.get<ChecklistItemWithUnknownFields[]>(
      `/v2/issues/${issueId}/checklistItems`
    );

    this.logger.info(
      `Получено ${Array.isArray(checklist) ? checklist.length : 0} элементов чеклиста для задачи ${issueId}`
    );

    return Array.isArray(checklist) ? checklist : [];
  }
}
