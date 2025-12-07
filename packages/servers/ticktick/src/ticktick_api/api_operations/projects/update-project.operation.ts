/**
 * Operation: Update existing project
 *
 * Responsibilities (SRP):
 * - ONLY update existing project
 * - Invalidate related caches
 * - NO reading/creation/deletion
 *
 * API: POST /project/{projectId}
 */

import { BaseOperation } from '#ticktick_api/api_operations/base-operation.js';
import type { UpdateProjectDto } from '#ticktick_api/dto/project.dto.js';
import type { ProjectWithUnknownFields } from '#ticktick_api/entities/project.entity.js';

export class UpdateProjectOperation extends BaseOperation {
  /**
   * Update existing project
   *
   * @param projectId - project identifier
   * @param dto - project update data
   * @returns updated project
   *
   * NOTE:
   * - Retry is handled ONLY in HttpClient.post (no double retry)
   * - Invalidates project and projects list caches
   */
  async execute(projectId: string, dto: UpdateProjectDto): Promise<ProjectWithUnknownFields> {
    this.logger.info(`Updating project: ${projectId}`);

    const result = await this.httpClient.post<ProjectWithUnknownFields>(
      `/project/${projectId}`,
      dto
    );

    // Invalidate related caches
    await this.cacheManager.delete(`project:${projectId}`);
    await this.cacheManager.delete(`project:${projectId}:data`);
    await this.cacheManager.delete('projects:all');

    this.logger.info(`Updated project: ${result.name} (${result.id})`);

    return result;
  }
}
