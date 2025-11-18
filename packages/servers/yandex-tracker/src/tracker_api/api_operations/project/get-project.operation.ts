/**
 * Операция получения одного проекта в Яндекс.Трекере
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение одного проекта по ID
 * - Кеширование проекта по его ID
 * - Поддержка expand параметров
 * - НЕТ создания/обновления/удаления
 *
 * API: GET /v2/projects/{projectId}
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@mcp-framework/infrastructure';
import type { ProjectOutput } from '@tracker_api/dto/index.js';

export interface GetProjectParams {
  /** ID или ключ проекта */
  projectId: string;

  /** Дополнительные поля для включения в ответ */
  expand?: string;
}

export class GetProjectOperation extends BaseOperation {
  /**
   * Получает один проект по ID или ключу
   *
   * @param params - параметры запроса (projectId, expand)
   * @returns проект с полными данными
   *
   * ВАЖНО:
   * - Кеширование по ID проекта
   * - Retry делается ТОЛЬКО в HttpClient.get (нет двойного retry)
   * - expand позволяет получить дополнительные поля
   */
  async execute(params: GetProjectParams): Promise<ProjectOutput> {
    const { projectId, expand } = params;

    this.logger.info(`Получение проекта: ${projectId}`);

    const cacheKey = EntityCacheKey.createKey(EntityType.PROJECT, projectId);

    return this.withCache(cacheKey, async () => {
      const queryParams = new URLSearchParams();
      if (expand) queryParams.append('expand', expand);

      const endpoint = `/v2/projects/${projectId}${
        queryParams.toString() ? `?${queryParams.toString()}` : ''
      }`;

      const project = await this.httpClient.get<ProjectOutput>(endpoint);

      this.logger.info(`Проект получен: ${project.key}`);

      return project;
    });
  }
}
