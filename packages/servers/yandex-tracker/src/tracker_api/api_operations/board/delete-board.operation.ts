/**
 * Операция удаления доски в Яндекс.Трекере
 *
 * Ответственность (SRP):
 * - ТОЛЬКО удаление доски
 * - Инвалидация кеша после удаления
 * - НЕТ создания/получения/обновления
 *
 * API: DELETE /v2/boards/{boardId}
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';

export interface DeleteBoardParams {
  /** ID доски для удаления */
  boardId: string;
}

export class DeleteBoardOperation extends BaseOperation {
  /**
   * Удаляет доску
   *
   * @param params - параметры (boardId)
   *
   * ВАЖНО:
   * - После удаления инвалидируется кеш доски
   * - Retry делается ТОЛЬКО в HttpClient.delete (нет двойного retry)
   */
  async execute(params: DeleteBoardParams): Promise<void> {
    const { boardId } = params;

    this.logger.info(`Удаление доски: ${boardId}`);

    const endpoint = `/v2/boards/${boardId}`;

    await this.httpClient.delete(endpoint);

    // Инвалидация кеша удаленной доски
    const cacheKey = EntityCacheKey.createKey(EntityType.BOARD, boardId);
    await this.cacheManager.delete(cacheKey);

    this.logger.info(`Доска удалена: ${boardId}`);
  }
}
