/**
 * Operation: Delete project
 *
 * Responsibilities (SRP):
 * - ONLY delete project
 * - Invalidate related caches
 * - NO reading/creation/update
 *
 * API: DELETE /project/{projectId}
 */

import { BaseOperation } from '#ticktick_api/api_operations/base-operation.js';

export class DeleteProjectOperation extends BaseOperation {
  /**
   * Delete project
   *
   * @param projectId - project identifier
   *
   * NOTE:
   * - Retry is handled ONLY in HttpClient.delete (no double retry)
   * - Invalidates project and projects list caches
   * - This operation is irreversible
   */
  async execute(projectId: string): Promise<void> {
    this.logger.info(`Deleting project: ${projectId}`);

    await this.deleteRequest(`/project/${projectId}`);

    // Invalidate related caches
    await this.cacheManager.delete(`project:${projectId}`);
    await this.cacheManager.delete(`project:${projectId}:data`);
    await this.cacheManager.delete('projects:all');

    this.logger.info(`Deleted project: ${projectId}`);
  }
}
