/**
 * Операция создания спринта в Яндекс.Трекере
 *
 * Ответственность (SRP):
 * - ТОЛЬКО создание нового спринта
 * - Инвалидация кеша после создания
 * - НЕТ получения/обновления/удаления
 *
 * API: POST /v2/sprints
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';
import type { CreateSprintDto, SprintOutput } from '#tracker_api/dto/index.js';

export class CreateSprintOperation extends BaseOperation {
  /**
   * Создает новый спринт
   *
   * @param dto - данные для создания спринта
   * @returns созданный спринт
   *
   * ВАЖНО:
   * - После создания инвалидируется кеш для нового спринта
   * - Retry делается ТОЛЬКО в HttpClient.post (нет двойного retry)
   */
  async execute(dto: CreateSprintDto): Promise<SprintOutput> {
    this.logger.info(`Создание спринта: ${dto.name}`);

    const endpoint = '/v2/sprints';

    const sprint = await this.httpClient.post<SprintOutput>(endpoint, dto);

    // Инвалидация кеша для нового спринта
    const cacheKey = EntityCacheKey.createKey(EntityType.SPRINT, sprint.id);
    await this.cacheManager.delete(cacheKey);

    this.logger.info(`Спринт создан: ${sprint.id}`);

    return sprint;
  }
}
