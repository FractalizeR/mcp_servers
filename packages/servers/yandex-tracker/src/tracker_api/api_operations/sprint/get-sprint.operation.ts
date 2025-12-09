/**
 * Операция получения одного спринта в Яндекс.Трекере
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение одного спринта по ID
 * - Кеширование спринта по его ID
 * - НЕТ создания/обновления/удаления
 *
 * API: GET /v2/sprints/{sprintId}
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';
import type { SprintOutput } from '#tracker_api/dto/index.js';

export interface GetSprintParams {
  /** ID спринта */
  sprintId: string;
}

export class GetSprintOperation extends BaseOperation {
  /**
   * Получает один спринт по ID
   *
   * @param params - параметры запроса (sprintId)
   * @returns спринт с полными данными
   *
   * ВАЖНО:
   * - Кеширование по ID спринта
   * - Retry делается ТОЛЬКО в HttpClient.get (нет двойного retry)
   */
  async execute(params: GetSprintParams): Promise<SprintOutput> {
    const { sprintId } = params;

    this.logger.info(`Получение спринта: ${sprintId}`);

    const cacheKey = EntityCacheKey.createKey(EntityType.SPRINT, sprintId);

    return this.withCache(cacheKey, async () => {
      const endpoint = `/v2/sprints/${sprintId}`;

      const sprint = await this.httpClient.get<SprintOutput>(endpoint);

      this.logger.info(`Спринт получен: ${sprint.name}`);

      return sprint;
    });
  }
}
