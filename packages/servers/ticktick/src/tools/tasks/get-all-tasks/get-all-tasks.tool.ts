/**
 * MCP Tool for getting all tasks from TickTick
 *
 * Fetches tasks from all projects with optional status filtering.
 */

import { BaseTool, ResponseFieldFilter } from '@mcp-framework/core';
import type { TickTickFacade } from '#ticktick_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/index.js';
import { TaskStatusValues } from '#common/schemas/index.js';
import { GetAllTasksParamsSchema } from './get-all-tasks.schema.js';
import { GET_ALL_TASKS_TOOL_METADATA } from './get-all-tasks.metadata.js';

/**
 * Tool for getting all tasks from all projects
 */
export class GetAllTasksTool extends BaseTool<TickTickFacade> {
  /**
   * Static metadata for compile-time indexing
   */
  static override readonly METADATA = GET_ALL_TASKS_TOOL_METADATA;

  /**
   * Auto-generate definition from Zod schema
   */
  protected override getParamsSchema(): typeof GetAllTasksParamsSchema {
    return GetAllTasksParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Validate parameters via BaseTool
    const validation = this.validateParams(params, GetAllTasksParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { fields, status } = validation.data;

    try {
      // 2. Get all tasks from facade
      let tasks = await this.facade.getAllTasks();

      // 3. Filter by status
      if (status === 'uncompleted') {
        tasks = tasks.filter((t) => t.status !== TaskStatusValues.COMPLETED);
      } else if (status === 'completed') {
        tasks = tasks.filter((t) => t.status === TaskStatusValues.COMPLETED);
      }

      // 4. Apply field filtering
      const filtered = tasks.map((task) =>
        ResponseFieldFilter.filter<TaskWithUnknownFields>(task, fields)
      );

      // 5. Log success
      this.logger.info(`All tasks retrieved: ${filtered.length} tasks (${status})`);

      return this.formatSuccess({
        total: filtered.length,
        status,
        tasks: filtered,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError('Failed to get all tasks', error);
    }
  }
}
