/**
 * MCP Tool for getting multiple tasks from TickTick (batch)
 *
 * Uses parallel execution for efficiency.
 */

import { BaseTool, ResponseFieldFilter, BatchResultProcessor } from '@mcp-framework/core';
import type { TickTickFacade } from '#ticktick_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/index.js';
import { GetTasksParamsSchema } from './get-tasks.schema.js';
import { GET_TASKS_TOOL_METADATA } from './get-tasks.metadata.js';

/**
 * Tool for getting multiple tasks by project and task IDs
 */
export class GetTasksTool extends BaseTool<TickTickFacade> {
  /**
   * Static metadata for compile-time indexing
   */
  static override readonly METADATA = GET_TASKS_TOOL_METADATA;

  /**
   * Auto-generate definition from Zod schema
   */
  protected override getParamsSchema(): typeof GetTasksParamsSchema {
    return GetTasksParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Validate parameters via BaseTool
    const validation = this.validateParams(params, GetTasksParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { tasks, fields } = validation.data;

    try {
      // 2. Get tasks from API (parallel execution via facade)
      const results = await this.facade.getTasks(tasks);

      // 3. Process results with field filtering
      const processedResults = BatchResultProcessor.process(
        results,
        (task: TaskWithUnknownFields): Partial<TaskWithUnknownFields> =>
          ResponseFieldFilter.filter<TaskWithUnknownFields>(task, fields)
      );

      // 4. Log results
      this.logger.info(
        `Tasks batch: ${processedResults.successful.length} successful, ${processedResults.failed.length} failed`
      );

      return this.formatSuccess({
        total: tasks.length,
        successful: processedResults.successful.length,
        failed: processedResults.failed.length,
        tasks: processedResults.successful.map((item) => ({
          taskId: item.key,
          task: item.data,
        })),
        errors: processedResults.failed.map((item) => ({
          taskId: item.key,
          error: item.error,
        })),
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(`Failed to get ${tasks.length} tasks`, error);
    }
  }
}
