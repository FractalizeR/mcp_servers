/**
 * Операция обновления доски в Яндекс.Трекере
 *
 * Ответственность (SRP):
 * - ТОЛЬКО обновление существующей доски
 * - Инвалидация кеша после обновления
 * - НЕТ создания/получения/удаления
 *
 * API: PATCH /v2/boards/{boardId}
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';
import type { UpdateBoardDto, BoardOutput } from '#tracker_api/dto/index.js';

export class UpdateBoardOperation extends BaseOperation {
  /**
   * Обновляет существующую доску
   *
   * @param dto - данные для обновления доски
   * @returns обновленная доска
   *
   * ВАЖНО:
   * - После обновления инвалидируется кеш доски
   * - Retry делается ТОЛЬКО в HttpClient.patch (нет двойного retry)
   * - Поддержка version для оптимистичных блокировок
   */
  async execute(dto: UpdateBoardDto): Promise<BoardOutput> {
    const { boardId, ...updateData } = dto;

    this.logger.info(`Обновление доски: ${boardId}`);

    const endpoint = `/v2/boards/${boardId}`;

    const board = await this.httpClient.patch<BoardOutput>(endpoint, updateData);

    // Инвалидация кеша обновленной доски
    const cacheKey = EntityCacheKey.createKey(EntityType.BOARD, board.id);
    await this.cacheManager.delete(cacheKey);

    this.logger.info(`Доска обновлена: ${board.id}`);

    return board;
  }
}
