/**
 * Операция получения списка досок в Яндекс.Трекере
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение списка всех досок
 * - НЕТ фильтрации по конкретным параметрам (это делается на стороне клиента)
 * - НЕТ создания/обновления/удаления
 *
 * API: GET /v2/boards
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';
import type { BoardsListOutput } from '@tracker_api/dto/index.js';

export interface GetBoardsParams {
  /** Локализация полей */
  localized?: boolean | undefined;
}

export class GetBoardsOperation extends BaseOperation {
  /**
   * Получает список всех досок
   *
   * @param params - параметры запроса (опциональные)
   * @returns массив досок
   *
   * ВАЖНО:
   * - Результат НЕ кешируется (список досок может часто изменяться)
   * - Retry делается ТОЛЬКО в HttpClient.get (нет двойного retry)
   */
  async execute(params?: GetBoardsParams): Promise<BoardsListOutput> {
    this.logger.info('Получение списка досок');

    const queryParams = new URLSearchParams();
    if (params?.localized !== undefined) {
      queryParams.append('localized', params.localized.toString());
    }

    const endpoint = `/v2/boards${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const boards = await this.httpClient.get<BoardsListOutput>(endpoint);

    this.logger.info(`Получено досок: ${boards.length}`);

    return boards;
  }
}
