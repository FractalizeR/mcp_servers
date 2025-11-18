/**
 * Операция удаления комментария
 *
 * Ответственность (SRP):
 * - ТОЛЬКО удаление комментария
 * - НЕТ добавления/получения/редактирования комментариев
 *
 * API: DELETE /v3/issues/{issueId}/comments/{commentId}
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';

export class DeleteCommentOperation extends BaseOperation {
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

    try {
      await this.deleteRequest<void>(`/v3/issues/${issueId}/comments/${commentId}`);

      this.logger.info(`Комментарий ${commentId} задачи ${issueId} успешно удалён`);
    } catch (error) {
      this.logger.error(`Ошибка при удалении комментария ${commentId} задачи ${issueId}:`, error);
      throw error;
    }
  }
}
