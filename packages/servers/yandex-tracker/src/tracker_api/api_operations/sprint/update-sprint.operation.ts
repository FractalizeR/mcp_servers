/**
 * Операция обновления спринта в Яндекс.Трекере
 *
 * Ответственность (SRP):
 * - ТОЛЬКО обновление существующего спринта
 * - Инвалидация кеша после обновления
 * - НЕТ создания/получения/удаления
 *
 * API: PATCH /v2/sprints/{sprintId}
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@mcp-framework/infrastructure';
import type { UpdateSprintDto, SprintOutput } from '@tracker_api/dto/index.js';

export class UpdateSprintOperation extends BaseOperation {
  /**
   * Обновляет существующий спринт
   *
   * @param dto - данные для обновления спринта
   * @returns обновленный спринт
   *
   * ВАЖНО:
   * - После обновления инвалидируется кеш спринта
   * - Retry делается ТОЛЬКО в HttpClient.patch (нет двойного retry)
   * - Поддержка version для оптимистичных блокировок
   */
  async execute(dto: UpdateSprintDto): Promise<SprintOutput> {
    const { sprintId, ...updateData } = dto;

    this.logger.info(`Обновление спринта: ${sprintId}`);

    const endpoint = `/v2/sprints/${sprintId}`;

    const sprint = await this.httpClient.patch<SprintOutput>(endpoint, updateData);

    // Инвалидация кеша обновленного спринта
    const cacheKey = EntityCacheKey.createKey(EntityType.SPRINT, sprint.id);
    this.cacheManager.delete(cacheKey);

    this.logger.info(`Спринт обновлен: ${sprint.id}`);

    return sprint;
  }
}
