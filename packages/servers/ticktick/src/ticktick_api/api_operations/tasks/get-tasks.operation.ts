/**
 * Batch operation for getting multiple tasks in parallel
 *
 * Responsibility (SRP):
 * - ONLY getting multiple tasks by refs (batch mode)
 * - Parallel execution via ParallelExecutor (with throttling)
 * - Respecting maxConcurrentRequests from configuration
 * - NO create/update/delete
 *
 * Uses ParallelExecutor for centralized throttling and batch size control.
 */

import { BaseOperation } from '#ticktick_api/api_operations/base-operation.js';
import { ParallelExecutor } from '@fractalizer/mcp-infrastructure';
import type { BatchResult, IHttpClient, CacheManager, Logger } from '@fractalizer/mcp-infrastructure';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/task.entity.js';
import type { ServerConfig } from '#config';

/**
 * Reference to a task (projectId + taskId)
 */
export interface TaskRef {
  /** Project/list ID */
  projectId: string;
  /** Task ID */
  taskId: string;
}

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

/**
 * Result type for batch task operation
 */
export type BatchTaskResult = BatchResult<string, TaskWithUnknownFields>;

export class GetTasksOperation extends BaseOperation {
  private readonly parallelExecutor: ParallelExecutor;

  constructor(
    httpClient: IHttpClient,
    cacheManager: CacheManager,
    logger: Logger,
    config: ServerConfig
  ) {
    super(httpClient, cacheManager, logger);

    // Initialize ParallelExecutor for concurrency control
    this.parallelExecutor = new ParallelExecutor(logger, {
      maxBatchSize: config.batch.maxBatchSize,
      maxConcurrentRequests: config.batch.maxConcurrentRequests,
    });
  }

  /**
   * Get multiple tasks in parallel with concurrency control
   *
   * @param taskRefs - Array of task references (projectId + taskId)
   * @returns Array of results (fulfilled | rejected) in same order as input
   * @throws {Error} if number of refs exceeds maxBatchSize (validated in ParallelExecutor)
   *
   * Notes:
   * - Uses ParallelExecutor for maxConcurrentRequests throttling
   * - Retry is handled by HttpClient (no double retry)
   * - Caching works individually for each task
   */
  async execute(taskRefs: TaskRef[]): Promise<BatchTaskResult> {
    // Handle empty array
    if (taskRefs.length === 0) {
      this.logger.warn('GetTasksOperation: empty refs array');
      return [];
    }

    this.logger.info(`Getting ${taskRefs.length} tasks in parallel`);

    // Create operations with caching for each task
    const operations = taskRefs.map((ref) => ({
      key: ref.taskId,
      fn: async (): Promise<TaskWithUnknownFields> => {
        const cacheKey = createTaskCacheKey(ref.projectId, ref.taskId);

        return this.withCache(cacheKey, async () => {
          return this.httpClient.get<TaskWithUnknownFields>(
            `/project/${ref.projectId}/task/${ref.taskId}`
          );
        });
      },
    }));

    // Execute via ParallelExecutor (centralized throttling)
    return this.parallelExecutor.executeParallel(operations, 'get tasks');
  }
}
