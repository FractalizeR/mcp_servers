/**
 * Операция удаления записи времени
 *
 * Ответственность (SRP):
 * - ТОЛЬКО удаление записи времени
 * - НЕТ добавления/получения/редактирования записей
 *
 * API: DELETE /v2/issues/{issueId}/worklog/{worklogId}
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';

export class DeleteWorklogOperation extends BaseOperation {
  /**
   * Удаляет запись времени
   *
   * @param issueId - идентификатор или ключ задачи (например, 'QUEUE-123')
   * @param worklogId - идентификатор записи времени
   * @returns void
   * @throws {Error} если запрос завершился с ошибкой
   *
   * ВАЖНО:
   * - Retry делается автоматически в HttpClient.delete (через deleteRequest)
   * - API не возвращает данные при успешном удалении
   * - Эндпоинт из API v2 (не v3!)
   */
  async execute(issueId: string, worklogId: string): Promise<void> {
    this.logger.info(`Удаление записи времени ${worklogId} задачи ${issueId}`);

    await this.deleteRequest<void>(`/v2/issues/${issueId}/worklog/${worklogId}`);

    this.logger.info(`Запись времени ${worklogId} задачи ${issueId} успешно удалена`);
  }
}
