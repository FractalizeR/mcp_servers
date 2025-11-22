/**
 * Операция создания проекта в Яндекс.Трекере
 *
 * Ответственность (SRP):
 * - ТОЛЬКО создание проекта
 * - Инвалидация кеша после создания
 * - НЕТ обновления/удаления
 *
 * API: POST /v2/projects
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@mcp-framework/infrastructure';
import type { CreateProjectDto, ProjectOutput } from '#tracker_api/dto/index.js';

export class CreateProjectOperation extends BaseOperation {
  /**
   * Создает новый проект
   *
   * @param data - данные нового проекта
   * @returns созданный проект
   *
   * ВАЖНО:
   * - После создания инвалидирует кеш списка проектов
   * - Retry делается ТОЛЬКО в HttpClient.post (нет двойного retry)
   */
  async execute(data: CreateProjectDto): Promise<ProjectOutput> {
    this.logger.info(`Создание проекта: ${data.key}`);

    const endpoint = '/v2/projects';

    const project = await this.httpClient.post<ProjectOutput>(endpoint, data);

    this.logger.info(`Проект создан: ${project.key} (ID: ${project.id})`);

    // Инвалидируем кеш списка проектов
    const listCacheKey = EntityCacheKey.createKey(EntityType.PROJECT, 'list');
    await this.cacheManager.delete(listCacheKey);

    // Сохраняем в кеш созданный проект
    const cacheKey = EntityCacheKey.createKey(EntityType.PROJECT, project.id);
    await this.cacheManager.set(cacheKey, project);

    return project;
  }
}
