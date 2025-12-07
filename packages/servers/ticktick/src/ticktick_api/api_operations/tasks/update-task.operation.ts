/**
 * Operation for updating an existing task in TickTick
 *
 * Responsibility (SRP):
 * - ONLY updating existing tasks
 * - Invalidating task and project caches after update
 * - NO create/read/delete
 *
 * API: POST /project/{projectId}/task/{taskId}
 */

import { BaseOperation } from '#ticktick_api/api_operations/base-operation.js';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/task.entity.js';
import type { UpdateTaskDto } from '#ticktick_api/dto/task.dto.js';

/**
 * Cache key prefixes
 */
const TASK_CACHE_PREFIX = 'task';
const PROJECT_DATA_CACHE_PREFIX = 'project';

/**
 * Create cache key for a task
 */
function createTaskCacheKey(projectId: string, taskId: string): string {
  return `${TASK_CACHE_PREFIX}:${projectId}:${taskId}`;
}

/**
 * Create cache key for project data
 */
function createProjectDataCacheKey(projectId: string): string {
  return `${PROJECT_DATA_CACHE_PREFIX}:${projectId}:data`;
}

export class UpdateTaskOperation extends BaseOperation {
  /**
   * Update an existing task
   *
   * @param projectId - Project/list ID
   * @param taskId - Task ID
   * @param dto - Update data (partial)
   * @returns Updated task with all fields
   *
   * Notes:
   * - Only provided fields will be updated
   * - Invalidates both task and project caches
   * - Retry is handled by HttpClient
   */
  async execute(
    projectId: string,
    taskId: string,
    dto: UpdateTaskDto
  ): Promise<TaskWithUnknownFields> {
    this.logger.info(`Updating task: ${projectId}/${taskId}`);

    const result = await this.httpClient.post<TaskWithUnknownFields>(
      `/project/${projectId}/task/${taskId}`,
      dto
    );

    // Invalidate caches
    const taskCacheKey = createTaskCacheKey(projectId, taskId);
    const projectCacheKey = createProjectDataCacheKey(projectId);

    await Promise.all([
      this.cacheManager.delete(taskCacheKey),
      this.cacheManager.delete(projectCacheKey),
    ]);

    this.logger.debug(`Invalidated caches: ${taskCacheKey}, ${projectCacheKey}`);
    this.logger.info(`Task updated: ${result.id}`);

    return result;
  }
}
