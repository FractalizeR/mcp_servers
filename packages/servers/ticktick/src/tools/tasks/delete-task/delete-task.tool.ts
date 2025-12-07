/**
 * MCP Tool for deleting a task in TickTick
 */

import { BaseTool } from '@mcp-framework/core';
import type { TickTickFacade } from '#ticktick_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { DeleteTaskParamsSchema } from './delete-task.schema.js';
import { DELETE_TASK_TOOL_METADATA } from './delete-task.metadata.js';

/**
 * Tool for deleting a task
 */
export class DeleteTaskTool extends BaseTool<TickTickFacade> {
  /**
   * Static metadata for compile-time indexing
   */
  static override readonly METADATA = DELETE_TASK_TOOL_METADATA;

  /**
   * Auto-generate definition from Zod schema
   */
  protected override getParamsSchema(): typeof DeleteTaskParamsSchema {
    return DeleteTaskParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Validate parameters via BaseTool
    const validation = this.validateParams(params, DeleteTaskParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { projectId, taskId } = validation.data;

    try {
      // 2. Get task title before deletion for confirmation
      let taskTitle = taskId;
      try {
        const task = await this.facade.getTask(projectId, taskId);
        taskTitle = task.title;
      } catch {
        // Task might already be deleted or inaccessible, continue with ID
      }

      // 3. Delete task via facade
      await this.facade.deleteTask(projectId, taskId);

      // 4. Log success
      this.logger.info(`Task "${taskTitle}" deleted`);

      return this.formatSuccess({
        message: `Task "${taskTitle}" deleted successfully`,
        deletedTaskId: taskId,
        projectId,
      });
    } catch (error: unknown) {
      return this.formatError(`Failed to delete task ${taskId}`, error);
    }
  }
}
