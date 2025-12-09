/**
 * Операция удаления проекта в Яндекс.Трекере
 *
 * Ответственность (SRP):
 * - ТОЛЬКО удаление проекта
 * - Инвалидация кеша после удаления
 * - НЕТ создания/обновления
 *
 * API: DELETE /v2/projects/{projectId}
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';

export interface DeleteProjectParams {
  /** ID или ключ проекта */
  projectId: string;
}

export class DeleteProjectOperation extends BaseOperation {
  /**
   * Удаляет проект
   *
   * @param params - параметры удаления (projectId)
   * @returns void (успешное удаление)
   *
   * ВАЖНО:
   * - После удаления инвалидирует кеш проекта и списка проектов
   * - Retry делается ТОЛЬКО в HttpClient.delete (нет двойного retry)
   */
  async execute(params: DeleteProjectParams): Promise<void> {
    const { projectId } = params;

    this.logger.info(`Удаление проекта: ${projectId}`);

    const endpoint = `/v2/projects/${projectId}`;

    await this.httpClient.delete(endpoint);

    this.logger.info(`Проект удален: ${projectId}`);

    // Инвалидируем кеш проекта
    const cacheKey = EntityCacheKey.createKey(EntityType.PROJECT, projectId);
    await this.cacheManager.delete(cacheKey);

    // Инвалидируем кеш списка проектов
    const listCacheKey = EntityCacheKey.createKey(EntityType.PROJECT, 'list');
    await this.cacheManager.delete(listCacheKey);
  }
}
