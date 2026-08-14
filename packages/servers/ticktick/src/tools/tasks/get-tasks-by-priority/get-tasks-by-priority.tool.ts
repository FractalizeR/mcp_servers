/**
 * MCP Tool for getting tasks by priority in TickTick
 */

import {
  BaseTool,
  ResponseFieldFilter,
  resolveCollectionResponseMode,
} from '@fractalizer/mcp-core';
import type { TickTickFacade } from '#ticktick_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/index.js';
import { buildTaskResourceLink } from '#tools/shared/index.js';
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

    const { priority, fields, responseMode } = validation.data;

    try {
      // 2. Get tasks by priority via facade
      const tasks = await this.facade.getTasksByPriority(priority);

      // 3. Resolve links/full mode BEFORE field-filtering (см. get-all-tasks.tool.ts)
      const resolvedMode = resolveCollectionResponseMode(responseMode, tasks.length);
      const items =
        resolvedMode === 'full'
          ? tasks.map((task) => ResponseFieldFilter.filter<TaskWithUnknownFields>(task, fields))
          : tasks;

      // 4. Log success
      const priorityLabel = PRIORITY_LABELS[priority] ?? String(priority);
      this.logger.info(
        `Tasks with priority ${priorityLabel}: ${tasks.length} found, mode=${resolvedMode}`
      );

      return this.formatCollectionResult({
        items,
        mode: resolvedMode,
        toResourceLink: buildTaskResourceLink,
        summary: { priority, priorityLabel, fieldsReturned: fields },
      });
    } catch (error: unknown) {
      return this.formatError(`Failed to get tasks with priority ${priority}`, error);
    }
  }
}
