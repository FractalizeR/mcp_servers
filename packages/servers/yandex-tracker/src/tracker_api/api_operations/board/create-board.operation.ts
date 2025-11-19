/**
 * Операция создания доски в Яндекс.Трекере
 *
 * Ответственность (SRP):
 * - ТОЛЬКО создание новой доски
 * - Инвалидация кеша после создания
 * - НЕТ получения/обновления/удаления
 *
 * API: POST /v2/boards
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@mcp-framework/infrastructure';
import type { CreateBoardDto, BoardOutput } from '@tracker_api/dto/index.js';

export class CreateBoardOperation extends BaseOperation {
  /**
   * Создает новую доску
   *
   * @param dto - данные для создания доски
   * @returns созданная доска
   *
   * ВАЖНО:
   * - После создания инвалидируется кеш для новой доски
   * - Retry делается ТОЛЬКО в HttpClient.post (нет двойного retry)
   */
  async execute(dto: CreateBoardDto): Promise<BoardOutput> {
    this.logger.info(`Создание доски: ${dto.name}`);

    const endpoint = '/v2/boards';

    const board = await this.httpClient.post<BoardOutput>(endpoint, dto);

    // Инвалидация кеша для новой доски
    const cacheKey = EntityCacheKey.createKey(EntityType.BOARD, board.id);
    this.cacheManager.delete(cacheKey);

    this.logger.info(`Доска создана: ${board.id}`);

    return board;
  }
}
