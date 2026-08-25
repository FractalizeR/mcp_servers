/**
 * Операция создания доски в Яндекс.Трекере
 *
 * Ответственность (SRP):
 * - ТОЛЬКО создание новой доски
 * - Инвалидация кеша после создания
 * - НЕТ получения/обновления/удаления
 *
 * API: POST /v3/liveBoards/ (0_CONTRACTS.md, D9). `POST /v3/boards` объявлен
 * устаревшим и молча игнорирует тело запроса, создавая доску по умолчанию.
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';
import type { CreateBoardDto, BoardOutput } from '#tracker_api/dto/index.js';

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

    const endpoint = '/v3/liveBoards/';

    const board = await this.httpClient.post<BoardOutput>(endpoint, dto);

    // Инвалидация кеша для новой доски
    const cacheKey = EntityCacheKey.createKey(EntityType.BOARD, String(board.id));
    await this.cacheManager.delete(cacheKey);

    this.logger.info(`Доска создана: ${board.id}`);

    return board;
  }
}
