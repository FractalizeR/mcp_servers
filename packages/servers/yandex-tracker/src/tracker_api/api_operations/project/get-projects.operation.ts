/**
 * Операция получения списка проектов в Яндекс.Трекере
 *
 * Ответственность (SRP):
 * - ТОЛЬКО получение списка проектов
 * - Поддержка пагинации и фильтрации
 * - Поддержка expand параметров
 * - НЕТ создания/обновления/удаления
 *
 * API: GET /v2/projects
 */

import { BaseOperation } from '@tracker_api/api_operations/base-operation.js';
import type { GetProjectsDto, ProjectsListOutput } from '@tracker_api/dto/index.js';

export class GetProjectsOperation extends BaseOperation {
  /**
   * Получает список проектов с поддержкой пагинации и фильтрации
   *
   * @param params - параметры запроса (page, perPage, expand, queueId)
   * @returns список проектов
   *
   * ВАЖНО:
   * - Retry делается ТОЛЬКО в HttpClient.get (нет двойного retry)
   * - expand позволяет получить дополнительные поля
   * - queueId фильтрует проекты по очереди
   */
  async execute(params: GetProjectsDto = {}): Promise<ProjectsListOutput> {
    const { page, perPage, expand, queueId } = params;

    this.logger.info('Получение списка проектов');

    const queryParams = new URLSearchParams();
    if (page) queryParams.append('page', page.toString());
    if (perPage) queryParams.append('perPage', perPage.toString());
    if (expand) queryParams.append('expand', expand);
    if (queueId) queryParams.append('queueId', queueId);

    const endpoint = `/v2/projects${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const projects = await this.httpClient.get<ProjectsListOutput['projects']>(endpoint);

    this.logger.info(`Получено проектов: ${projects.length}`);

    return {
      projects,
      total: projects.length,
    };
  }
}
