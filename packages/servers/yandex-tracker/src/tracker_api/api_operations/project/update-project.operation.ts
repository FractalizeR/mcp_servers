/**
 * Операция обновления проекта в Яндекс.Трекере
 *
 * Ответственность (SRP):
 * - ТОЛЬКО обновление проекта
 * - Инвалидация кеша после обновления
 * - НЕТ создания/удаления
 *
 * API: PATCH /v3/projects/{projectId}?version={version}
 *
 * Версия обязательна: без неё API отвечает 428 и правка не проходит вовсе
 * (живая проба 2026-08-25). Документация называет для правки `PUT`
 * (`api-ref/projects/update-project`), но 428 приходит именно от проверки
 * версии — значит, PATCH маршрутизируется; проверено живьём после правки.
 */

import { BaseOperation } from '#tracker_api/api_operations/base-operation.js';
import { EntityCacheKey, EntityType } from '@fractalizer/mcp-infrastructure';
import type { UpdateProjectDto, ProjectOutput } from '#tracker_api/dto/index.js';

export interface UpdateProjectParams {
  /** ID или ключ проекта */
  projectId: string;

  /** Данные для обновления */
  data: UpdateProjectDto;

  /** Версия проекта; не передана — операция прочитает текущую */
  version?: number | undefined;
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
    const { projectId, data, version } = params;

    this.logger.info(`Обновление проекта: ${projectId}`);

    const effectiveVersion = version ?? (await this.readCurrentVersion(projectId));
    const endpoint = `/v3/projects/${projectId}?version=${effectiveVersion}`;

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

  /**
   * Читает текущую версию проекта.
   *
   * Лишний GET осознан: без версии API отвечает 428, а вызывающий её обычно не
   * держит. Передавшему версию явно этот запрос не делается — там работает
   * настоящая оптимистичная блокировка.
   */
  private async readCurrentVersion(projectId: string): Promise<number> {
    const project = await this.httpClient.get<ProjectOutput>(`/v3/projects/${projectId}`);
    return project.version;
  }
}
