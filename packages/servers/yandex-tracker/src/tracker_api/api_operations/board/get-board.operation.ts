/**
 * Операция получения одной доски в Яндекс.Трекере
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение одной доски по ID
 * - Кеширование доски по её ID
 * - НЕТ создания/обновления/удаления
 *
 * API: GET /v2/boards/{boardId}
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';
import type { BoardOutput } from '#tracker_api/dto/index.js';

export interface GetBoardParams {
  /** ID доски */
  boardId: string;

  /** Локализация полей */
  localized?: boolean | undefined;
}

export class GetBoardOperation extends BaseOperation {
  /**
   * Получает одну доску по ID
   *
   * @param params - параметры запроса (boardId, localized)
   * @returns доска с полными данными
   *
   * ВАЖНО:
   * - Кеширование по ID доски
   * - Retry делается ТОЛЬКО в HttpClient.get (нет двойного retry)
   */
  async execute(params: GetBoardParams): Promise<BoardOutput> {
    const { boardId, localized } = params;

    this.logger.info(`Получение доски: ${boardId}`);

    const cacheKey = EntityCacheKey.createKey(EntityType.BOARD, boardId);

    return this.withCache(cacheKey, async () => {
      const queryParams = new URLSearchParams();
      if (localized !== undefined) {
        queryParams.append('localized', localized.toString());
      }

      const endpoint = `/v2/boards/${boardId}${
        queryParams.toString() ? `?${queryParams.toString()}` : ''
      }`;

      const board = await this.httpClient.get<BoardOutput>(endpoint);

      this.logger.info(`Доска получена: ${board.name}`);

      return board;
    });
  }
}
