/**
 * Операция добавления комментария к задаче
 *
 * Ответственность (SRP):
 * - ТОЛЬКО добавление комментария к задаче
 * - НЕТ получения/редактирования/удаления комментариев
 * - НЕТ batch-операций
 *
 * API: POST /v3/issues/{issueId}/comments
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';
import type { AddCommentInput } from '@tracker_api/dto/index.js';
import type { CommentWithUnknownFields } from '@tracker_api/entities/index.js';

export class AddCommentOperation extends BaseOperation {
  /**
   * Добавляет комментарий к задаче
   *
   * @param issueId - идентификатор или ключ задачи (например, 'QUEUE-123')
   * @param input - данные комментария
   * @returns созданный комментарий
   * @throws {Error} если запрос завершился с ошибкой
   *
   * ВАЖНО:
   * - Retry делается автоматически в HttpClient.post
   * - API возвращает полный объект комментария
   */
  async execute(issueId: string, input: AddCommentInput): Promise<CommentWithUnknownFields> {
    this.logger.info(`Добавление комментария к задаче ${issueId}`);

    const comment = await this.httpClient.post<CommentWithUnknownFields>(
      `/v3/issues/${issueId}/comments`,
      input
    );

    this.logger.info(`Комментарий успешно добавлен к задаче ${issueId}: ${comment.id}`);

    return comment;
  }
}
