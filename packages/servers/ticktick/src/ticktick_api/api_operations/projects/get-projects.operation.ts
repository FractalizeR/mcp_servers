/**
 * Operation: Get all projects
 *
 * Responsibilities (SRP):
 * - ONLY get list of all projects
 * - Cache results
 * - NO creation/update/deletion
 *
 * API: GET /project
 */

import { BaseOperation } from '#ticktick_api/api_operations/base-operation.js';
import type { ProjectWithUnknownFields } from '#ticktick_api/entities/project.entity.js';

export class GetProjectsOperation extends BaseOperation {
  /**
   * Get all projects
   *
   * @returns array of projects
   *
   * NOTE:
   * - Retry is handled ONLY in HttpClient.get (no double retry)
   * - Results are cached for configured TTL
   */
  async execute(): Promise<ProjectWithUnknownFields[]> {
    const cacheKey = 'projects:all';

    return this.withCache(cacheKey, async () => {
      this.logger.info('Fetching all projects');

      const projects = await this.httpClient.get<ProjectWithUnknownFields[]>('/project');

      this.logger.info(`Fetched ${projects.length} projects`);

      return projects;
    });
  }
}
