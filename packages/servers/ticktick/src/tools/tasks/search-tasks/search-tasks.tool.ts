/**
 * MCP Tool for searching tasks in TickTick
 *
 * Case-insensitive search in title and content.
 */

import { BaseTool, ResponseFieldFilter } from '@mcp-framework/core';
import type { TickTickFacade } from '#ticktick_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/index.js';
import { SearchTasksParamsSchema } from './search-tasks.schema.js';
import { SEARCH_TASKS_TOOL_METADATA } from './search-tasks.metadata.js';

/**
 * Tool for searching tasks by text
 */
export class SearchTasksTool extends BaseTool<TickTickFacade> {
  /**
   * Static metadata for compile-time indexing
   */
  static override readonly METADATA = SEARCH_TASKS_TOOL_METADATA;

  /**
   * Auto-generate definition from Zod schema
   */
  protected override getParamsSchema(): typeof SearchTasksParamsSchema {
    return SearchTasksParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Validate parameters via BaseTool
    const validation = this.validateParams(params, SearchTasksParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { query, fields } = validation.data;

    try {
      // 2. Search tasks via facade
      const tasks = await this.facade.searchTasks(query);

      // 3. Apply field filtering
      const filtered = tasks.map((task) =>
        ResponseFieldFilter.filter<TaskWithUnknownFields>(task, fields)
      );

      // 4. Log success
      this.logger.info(`Tasks search completed: ${filtered.length} found for "${query}"`);

      return this.formatSuccess({
        query,
        total: filtered.length,
        tasks: filtered,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(`Failed to search tasks with query: ${query}`, error);
    }
  }
}
