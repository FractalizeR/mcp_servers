/**
 * MCP Tool for searching tasks in TickTick
 *
 * Case-insensitive search in title and content.
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

    const { query, fields, responseMode } = validation.data;

    try {
      // 2. Search tasks via facade
      const tasks = await this.facade.searchTasks(query);

      // 3. Resolve links/full mode BEFORE field-filtering (см. get-all-tasks.tool.ts)
      const resolvedMode = resolveCollectionResponseMode(responseMode, tasks.length);
      const items =
        resolvedMode === 'full'
          ? tasks.map((task) => ResponseFieldFilter.filter<TaskWithUnknownFields>(task, fields))
          : tasks;

      // 4. Log success
      this.logger.info(
        `Tasks search completed: ${tasks.length} found for "${query}", mode=${resolvedMode}`
      );

      return this.formatCollectionResult({
        items,
        mode: resolvedMode,
        toResourceLink: buildTaskResourceLink,
        summary: { query, fieldsReturned: fields },
      });
    } catch (error: unknown) {
      return this.formatError(`Failed to search tasks with query: ${query}`, error);
    }
  }
}
