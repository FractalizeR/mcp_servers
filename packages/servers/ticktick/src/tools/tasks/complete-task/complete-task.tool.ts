/**
 * MCP Tool for completing a task in TickTick
 */

import { BaseTool } from '@fractalizer/mcp-core';
import type { TickTickFacade } from '#ticktick_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { CompleteTaskParamsSchema } from './complete-task.schema.js';
import { COMPLETE_TASK_TOOL_METADATA } from './complete-task.metadata.js';

/**
 * Tool for marking a task as completed
 */
export class CompleteTaskTool extends BaseTool<TickTickFacade> {
  /**
   * Static metadata for compile-time indexing
   */
  static override readonly METADATA = COMPLETE_TASK_TOOL_METADATA;

  /**
   * Auto-generate definition from Zod schema
   */
  protected override getParamsSchema(): typeof CompleteTaskParamsSchema {
    return CompleteTaskParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Validate parameters via BaseTool
    const validation = this.validateParams(params, CompleteTaskParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { projectId, taskId } = validation.data;

    try {
      // 2. Get task title for confirmation message
      const task = await this.facade.getTask(projectId, taskId);

      // 3. Complete task via facade
      await this.facade.completeTask(projectId, taskId);

      // 4. Log success
      this.logger.info(`Task "${task.title}" marked as completed`);

      return this.formatSuccess({
        message: `Task "${task.title}" marked as completed`,
        completedTaskId: taskId,
        projectId,
      });
    } catch (error: unknown) {
      return this.formatError(`Failed to complete task ${taskId}`, error);
    }
  }
}
