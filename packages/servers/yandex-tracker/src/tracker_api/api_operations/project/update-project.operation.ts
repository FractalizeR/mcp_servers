/**
 * Операция обновления проекта в Яндекс.Трекере
 *
 * Ответственность (SRP):
 * - ТОЛЬКО обновление проекта
 * - Инвалидация кеша после обновления
 * - НЕТ создания/удаления
 *
 * API: PATCH /v2/projects/{projectId}
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';
import type { UpdateProjectDto, ProjectOutput } from '#tracker_api/dto/index.js';

export interface UpdateProjectParams {
  /** ID или ключ проекта */
  projectId: string;

  /** Данные для обновления */
  data: UpdateProjectDto;
}

export class UpdateProjectOperation extends BaseOperation {
  /**
   * Обновляет существующий проект
   *
   * @param params - параметры обновления (projectId, data)
   * @returns обновленный проект
   *
   * ВАЖНО:
   * - После обновления инвалидирует кеш проекта
   * - Retry делается ТОЛЬКО в HttpClient.patch (нет двойного retry)
   */
  async execute(params: UpdateProjectParams): Promise<ProjectOutput> {
    const { projectId, data } = params;

    this.logger.info(`Обновление проекта: ${projectId}`);

    const endpoint = `/v2/projects/${projectId}`;

    const project = await this.httpClient.patch<ProjectOutput>(endpoint, data);

    this.logger.info(`Проект обновлен: ${project.key}`);

    // Инвалидируем кеш проекта
    const cacheKey = EntityCacheKey.createKey(EntityType.PROJECT, project.id);
    await this.cacheManager.delete(cacheKey);

    // Инвалидируем кеш списка проектов
    const listCacheKey = EntityCacheKey.createKey(EntityType.PROJECT, 'list');
    await this.cacheManager.delete(listCacheKey);

    return project;
  }
}
