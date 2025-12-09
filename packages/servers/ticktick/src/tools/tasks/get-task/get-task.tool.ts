/**
 * MCP Tool for getting a single task from TickTick
 *
 * API Tool (direct API access):
 * - 1 tool = 1 API call
 * - Minimal business logic
 * - Validation via Zod
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { TickTickFacade } from '#ticktick_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/index.js';
import { GetTaskParamsSchema } from './get-task.schema.js';
import { GET_TASK_TOOL_METADATA } from './get-task.metadata.js';

/**
 * Tool for getting a single task by project and task IDs
 */
export class GetTaskTool extends BaseTool<TickTickFacade> {
  /**
   * Static metadata for compile-time indexing
   */
  static override readonly METADATA = GET_TASK_TOOL_METADATA;

  /**
   * Auto-generate definition from Zod schema
   */
  protected override getParamsSchema(): typeof GetTaskParamsSchema {
    return GetTaskParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Validate parameters via BaseTool
    const validation = this.validateParams(params, GetTaskParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { projectId, taskId, fields } = validation.data;

    try {
      // 2. Get task from API
      const task = await this.facade.getTask(projectId, taskId);

      // 3. Filter fields
      const filtered = ResponseFieldFilter.filter<TaskWithUnknownFields>(task, fields);

      // 4. Log success
      this.logger.info(`Task ${taskId} retrieved with ${fields.length} fields`);

      return this.formatSuccess({
        task: filtered,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(`Failed to get task ${taskId} from project ${projectId}`, error);
    }
  }
}
