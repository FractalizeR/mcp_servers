/**
 * Operation for creating a new task in TickTick
 *
 * Responsibility (SRP):
 * - ONLY creating new tasks
 * - Invalidating project cache after creation
 * - NO read/update/delete
 *
 * API: POST /task
 */

import { BaseOperation } from '#ticktick_api/api_operations/base-operation.js';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/task.entity.js';
import type { CreateTaskDto } from '#ticktick_api/dto/task.dto.js';

/**
 * Cache key prefix for project data
 */
const PROJECT_DATA_CACHE_PREFIX = 'project';

/**
 * Create cache key for project data
 */
function createProjectDataCacheKey(projectId: string): string {
  return `${PROJECT_DATA_CACHE_PREFIX}:${projectId}:data`;
}

export class CreateTaskOperation extends BaseOperation {
  /**
   * Create a new task
   *
   * @param dto - Task creation data
   * @returns Created task with all fields
   *
   * Notes:
   * - If projectId is not provided, task will be created in inbox
   * - Invalidates project cache after creation
   * - Retry is handled by HttpClient
   */
  async execute(dto: CreateTaskDto): Promise<TaskWithUnknownFields> {
    this.logger.info(`Creating task: ${dto.title}`);

    const result = await this.httpClient.post<TaskWithUnknownFields>('/task', dto);

    // Invalidate project cache if task has a project
    if (result.projectId) {
      const cacheKey = createProjectDataCacheKey(result.projectId);
      await this.cacheManager.delete(cacheKey);
      this.logger.debug(`Invalidated cache: ${cacheKey}`);
    }

    this.logger.info(`Task created: ${result.id}`);

    return result;
  }
}
