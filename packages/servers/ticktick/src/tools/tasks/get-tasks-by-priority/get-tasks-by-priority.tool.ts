/**
 * MCP Tool for getting tasks by priority in TickTick
 */

import { BaseTool, ResponseFieldFilter } from '@mcp-framework/core';
import type { TickTickFacade } from '#ticktick_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/index.js';
import { GetTasksByPriorityParamsSchema } from './get-tasks-by-priority.schema.js';
import { GET_TASKS_BY_PRIORITY_TOOL_METADATA } from './get-tasks-by-priority.metadata.js';

/**
 * Priority labels for human-readable output
 */
const PRIORITY_LABELS: Record<number, string> = {
  0: 'none',
  1: 'low',
  3: 'medium',
  5: 'high',
};

/**
 * Tool for getting tasks by priority level
 */
export class GetTasksByPriorityTool extends BaseTool<TickTickFacade> {
  /**
   * Static metadata for compile-time indexing
   */
  static override readonly METADATA = GET_TASKS_BY_PRIORITY_TOOL_METADATA;

  /**
   * Auto-generate definition from Zod schema
   */
  protected override getParamsSchema(): typeof GetTasksByPriorityParamsSchema {
    return GetTasksByPriorityParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Validate parameters via BaseTool
    const validation = this.validateParams(params, GetTasksByPriorityParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { priority, fields } = validation.data;

    try {
      // 2. Get tasks by priority via facade
      const tasks = await this.facade.getTasksByPriority(priority);

      // 3. Apply field filtering
      const filtered = tasks.map((task) =>
        ResponseFieldFilter.filter<TaskWithUnknownFields>(task, fields)
      );

      // 4. Log success
      const priorityLabel = PRIORITY_LABELS[priority] ?? String(priority);
      this.logger.info(`Tasks with priority ${priorityLabel}: ${filtered.length} found`);

      return this.formatSuccess({
        priority,
        priorityLabel,
        total: filtered.length,
        tasks: filtered,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(`Failed to get tasks with priority ${priority}`, error);
    }
  }
}
