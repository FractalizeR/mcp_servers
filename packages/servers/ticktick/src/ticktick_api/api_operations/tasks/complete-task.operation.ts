/**
 * Operation for completing a task in TickTick
 *
 * Responsibility (SRP):
 * - ONLY marking tasks as complete
 * - Invalidating task and project caches after completion
 * - NO create/read/update/delete
 *
 * API: POST /task/{taskId}/complete
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

export class CompleteTaskOperation extends BaseOperation {
  /**
   * Mark a task as complete
   *
   * @param projectId - Project/list ID (for cache invalidation)
   * @param taskId - Task ID
   *
   * Notes:
   * - Sets task status to completed (2)
   * - Invalidates both task and project caches
   * - Retry is handled by HttpClient
   */
  async execute(projectId: string, taskId: string): Promise<void> {
    this.logger.info(`Completing task: ${taskId}`);

    await this.httpClient.post(`/task/${taskId}/complete`);

    // Invalidate caches
    const taskCacheKey = createTaskCacheKey(projectId, taskId);
    const projectCacheKey = createProjectDataCacheKey(projectId);

    await Promise.all([
      this.cacheManager.delete(taskCacheKey),
      this.cacheManager.delete(projectCacheKey),
    ]);

    this.logger.debug(`Invalidated caches: ${taskCacheKey}, ${projectCacheKey}`);
    this.logger.info(`Task completed: ${taskId}`);
  }
}
