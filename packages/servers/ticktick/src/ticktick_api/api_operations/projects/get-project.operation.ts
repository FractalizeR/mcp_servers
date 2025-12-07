/**
 * Operation: Get single project by ID
 *
 * Responsibilities (SRP):
 * - ONLY get single project
 * - Cache results
 * - NO creation/update/deletion
 *
 * API: GET /project/{projectId}
 */

import { BaseOperation } from '#ticktick_api/api_operations/base-operation.js';
import type { ProjectWithUnknownFields } from '#ticktick_api/entities/project.entity.js';

export class GetProjectOperation extends BaseOperation {
  /**
   * Get project by ID
   *
   * @param projectId - project identifier
   * @returns project data
   *
   * NOTE:
   * - Retry is handled ONLY in HttpClient.get (no double retry)
   * - Results are cached for configured TTL
   */
  async execute(projectId: string): Promise<ProjectWithUnknownFields> {
    const cacheKey = `project:${projectId}`;

    return this.withCache(cacheKey, async () => {
      this.logger.info(`Fetching project: ${projectId}`);

      const project = await this.httpClient.get<ProjectWithUnknownFields>(`/project/${projectId}`);

      this.logger.info(`Fetched project: ${project.name}`);

      return project;
    });
  }
}
