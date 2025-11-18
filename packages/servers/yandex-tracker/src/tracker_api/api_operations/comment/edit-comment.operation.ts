/**
 * Операция редактирования комментария
 *
 * Ответственность (SRP):
 * - ТОЛЬКО редактирование существующего комментария
 * - НЕТ добавления/получения/удаления комментариев
 *
 * API: PATCH /v3/issues/{issueId}/comments/{commentId}
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';
import type { EditCommentInput } from '@tracker_api/dto/index.js';
import type { CommentWithUnknownFields } from '@tracker_api/entities/index.js';

export class EditCommentOperation extends BaseOperation {
  /**
   * Редактирует комментарий
   *
   * @param issueId - идентификатор или ключ задачи (например, 'QUEUE-123')
   * @param commentId - идентификатор комментария
   * @param input - новые данные комментария
   * @returns обновлённый комментарий
   * @throws {Error} если запрос завершился с ошибкой
   *
   * ВАЖНО:
   * - Retry делается автоматически в HttpClient.patch
   * - API возвращает полный объект обновлённого комментария
   */
  async execute(
    issueId: string,
    commentId: string,
    input: EditCommentInput
  ): Promise<CommentWithUnknownFields> {
    this.logger.info(`Редактирование комментария ${commentId} задачи ${issueId}`);

    try {
      const comment = await this.httpClient.patch<CommentWithUnknownFields>(
        `/v3/issues/${issueId}/comments/${commentId}`,
        input
      );

      this.logger.info(`Комментарий ${commentId} задачи ${issueId} успешно обновлён`);

      return comment;
    } catch (error) {
      this.logger.error(
        `Ошибка при редактировании комментария ${commentId} задачи ${issueId}:`,
        error
      );
      throw error;
    }
  }
}
