/**
 * MCP Tool for getting all tasks from TickTick
 *
 * Fetches tasks from all projects with optional status filtering.
 */

import {
  BaseTool,
  ResponseFieldFilter,
  resolveCollectionResponseMode,
} from '@fractalizer/mcp-core';
import type { TickTickFacade } from '#ticktick_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/index.js';
import { TaskStatusValues } from '#common/schemas/index.js';
import { buildTaskResourceLink } from '#tools/shared/index.js';
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

    const { fields, status, responseMode } = validation.data;

    try {
      // 2. Get all tasks from facade
      let tasks = await this.facade.getAllTasks();

      // 3. Filter by status
      if (status === 'uncompleted') {
        tasks = tasks.filter((t) => t.status !== TaskStatusValues.COMPLETED);
      } else if (status === 'completed') {
        tasks = tasks.filter((t) => t.status === TaskStatusValues.COMPLETED);
      }

      // 4. Resolve links/full mode BEFORE field-filtering: `links` mode needs
      // raw tasks (id/title for resource_link), `full` needs them filtered —
      // см. `formatCollectionResult()` (framework), toResourceLink вызывается
      // только в 'links'.
      const resolvedMode = resolveCollectionResponseMode(responseMode, tasks.length);
      const items =
        resolvedMode === 'full'
          ? tasks.map((task) => ResponseFieldFilter.filter<TaskWithUnknownFields>(task, fields))
          : tasks;

      // 5. Log success
      this.logger.info(
        `All tasks retrieved: ${tasks.length} tasks (${status}), mode=${resolvedMode}`
      );

      return this.formatCollectionResult({
        items,
        mode: resolvedMode,
        toResourceLink: buildTaskResourceLink,
        summary: { status, fieldsReturned: fields },
      });
    } catch (error: unknown) {
      return this.formatError('Failed to get all tasks', error);
    }
  }
}
