/**
 * Operation for deleting a task from TickTick
 *
 * Responsibility (SRP):
 * - ONLY deleting tasks
 * - Invalidating task and project caches after deletion
 * - NO create/read/update
 *
 * API: DELETE /project/{projectId}/task/{taskId}
 */

import { BaseOperation } from '#ticktick_api/api_operations/base-operation.js';

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

export class DeleteTaskOperation extends BaseOperation {
  /**
   * Delete a task
   *
   * @param projectId - Project/list ID
   * @param taskId - Task ID
   *
   * Notes:
   * - Permanently deletes the task
   * - Invalidates both task and project caches
   * - Retry is handled by HttpClient
   */
  async execute(projectId: string, taskId: string): Promise<void> {
    this.logger.info(`Deleting task: ${projectId}/${taskId}`);

    await this.deleteRequest(`/project/${projectId}/task/${taskId}`);

    // Invalidate caches
    const taskCacheKey = createTaskCacheKey(projectId, taskId);
    const projectCacheKey = createProjectDataCacheKey(projectId);

    await Promise.all([
      this.cacheManager.delete(taskCacheKey),
      this.cacheManager.delete(projectCacheKey),
    ]);

    this.logger.debug(`Invalidated caches: ${taskCacheKey}, ${projectCacheKey}`);
    this.logger.info(`Task deleted: ${taskId}`);
  }
}
