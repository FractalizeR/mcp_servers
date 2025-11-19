/**
 * Операция получения списка комментариев задачи
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение комментариев задачи
 * - Поддержка пагинации
 * - НЕТ добавления/редактирования/удаления комментариев
 *
 * API: GET /v3/issues/{issueId}/comments
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';
import type { GetCommentsInput } from '@tracker_api/dto/index.js';
import type { CommentWithUnknownFields } from '@tracker_api/entities/index.js';

export class GetCommentsOperation extends BaseOperation {
  /**
   * Получает список комментариев задачи
   *
   * @param issueId - идентификатор или ключ задачи (например, 'QUEUE-123')
   * @param input - параметры запроса (пагинация, expand)
   * @returns массив комментариев
   * @throws {Error} если запрос завершился с ошибкой
   *
   * ВАЖНО:
   * - Retry делается автоматически в HttpClient.get
   * - API возвращает массив комментариев
   * - Поддерживает пагинацию через perPage и page параметры
   */
  async execute(
    issueId: string,
    input: GetCommentsInput = {}
  ): Promise<CommentWithUnknownFields[]> {
    this.logger.info(`Получение комментариев задачи ${issueId}`);

    // Подготовка query параметров
    const queryParams: Record<string, string> = {};
    if (input.perPage !== undefined) {
      queryParams['perPage'] = String(input.perPage);
    }
    if (input.page !== undefined) {
      queryParams['page'] = String(input.page);
    }
    if (input.expand !== undefined) {
      queryParams['expand'] = input.expand;
    }

    // Формирование URL с query параметрами
    const queryString =
      Object.keys(queryParams).length > 0
        ? `?${Object.entries(queryParams)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&')}`
        : '';

    const endpoint = `/v3/issues/${issueId}/comments${queryString}`;

    const comments = await this.httpClient.get<CommentWithUnknownFields[]>(endpoint);

    this.logger.info(
      `Получено ${Array.isArray(comments) ? comments.length : 1} комментариев для задачи ${issueId}`
    );

    return Array.isArray(comments) ? comments : [comments];
  }
}
