/**
 * Operation: Create new project
 *
 * Responsibilities (SRP):
 * - ONLY create new project
 * - Invalidate projects list cache
 * - NO reading/update/deletion
 *
 * API: POST /project
 */

import { BaseOperation } from '#ticktick_api/api_operations/base-operation.js';
import type { CreateProjectDto } from '#ticktick_api/dto/project.dto.js';
import type { ProjectWithUnknownFields } from '#ticktick_api/entities/project.entity.js';

export class CreateProjectOperation extends BaseOperation {
  /**
   * Create new project
   *
   * @param dto - project creation data
   * @returns created project
   *
   * NOTE:
   * - Retry is handled ONLY in HttpClient.post (no double retry)
   * - Invalidates projects list cache after creation
   */
  async execute(dto: CreateProjectDto): Promise<ProjectWithUnknownFields> {
    this.logger.info(`Creating project: ${dto.name}`);

    const result = await this.httpClient.post<ProjectWithUnknownFields>('/project', dto);

    // Invalidate projects list cache
    await this.cacheManager.delete('projects:all');

    this.logger.info(`Created project: ${result.name} (${result.id})`);

    return result;
  }
}
