/**
 * Operation for getting a single task from TickTick API
 *
 * Responsibility (SRP):
 * - ONLY getting one task by projectId and taskId
 * - Caching task by composite key
 * - NO create/update/delete
 *
 * API: GET /project/{projectId}/task/{taskId}
 */

import { BaseOperation } from '#ticktick_api/api_operations/base-operation.js';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/task.entity.js';

/**
 * Cache key prefix for tasks
 */
const TASK_CACHE_PREFIX = 'task';

/**
 * Create cache key for a task
 */
function createTaskCacheKey(projectId: string, taskId: string): string {
  return `${TASK_CACHE_PREFIX}:${projectId}:${taskId}`;
}

export class GetTaskOperation extends BaseOperation {
  /**
   * Get a single task by project and task IDs
   *
   * @param projectId - Project/list ID
   * @param taskId - Task ID
   * @returns Task with all fields
   *
   * Notes:
   * - Caching by composite key (projectId:taskId)
   * - Retry is handled by HttpClient (no double retry)
   */
  async execute(projectId: string, taskId: string): Promise<TaskWithUnknownFields> {
    this.logger.info(`Getting task: ${projectId}/${taskId}`);

    const cacheKey = createTaskCacheKey(projectId, taskId);

    return this.withCache(cacheKey, async () => {
      const task = await this.httpClient.get<TaskWithUnknownFields>(
        `/project/${projectId}/task/${taskId}`
      );

      this.logger.info(`Task retrieved: ${task.title}`);

      return task;
    });
  }
}
