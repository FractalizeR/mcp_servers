/**
 * Operation: Get project with all its tasks
 *
 * Responsibilities (SRP):
 * - ONLY get project data with tasks
 * - Cache results
 * - NO creation/update/deletion
 *
 * API: GET /project/{projectId}/data
 */

import { BaseOperation } from '#ticktick_api/api_operations/base-operation.js';
import type { ProjectWithUnknownFields } from '#ticktick_api/entities/project.entity.js';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/task.entity.js';

/**
 * Project data with all tasks
 */
export interface ProjectData {
  /** Project information */
  project: ProjectWithUnknownFields;
  /** All tasks in the project */
  tasks: TaskWithUnknownFields[];
}

export class GetProjectDataOperation extends BaseOperation {
  /**
   * Get project with all its tasks
   *
   * @param projectId - project identifier
   * @returns project with tasks
   *
   * NOTE:
   * - Retry is handled ONLY in HttpClient.get (no double retry)
   * - Results are cached for configured TTL
   * - This endpoint returns more data than GET /project/{id}
   */
  async execute(projectId: string): Promise<ProjectData> {
    const cacheKey = `project:${projectId}:data`;

    return this.withCache(cacheKey, async () => {
      this.logger.info(`Fetching project data: ${projectId}`);

      const data = await this.httpClient.get<ProjectData>(`/project/${projectId}/data`);

      this.logger.info(`Fetched project "${data.project.name}" with ${data.tasks.length} tasks`);

      return data;
    });
  }
}
