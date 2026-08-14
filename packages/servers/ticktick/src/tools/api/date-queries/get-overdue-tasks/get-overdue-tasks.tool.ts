/**
 * GetOverdueTasksTool - Get overdue tasks
 *
 * Retrieves all tasks that are past due date and not completed.
 * Results are sorted by due date (oldest first).
 */

import { BaseTool } from '@fractalizer/mcp-core';
import type { ToolDefinition } from '@fractalizer/mcp-core';
import type { TickTickFacade } from '#ticktick_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import {
  GetOverdueTasksParamsSchema,
  GET_OVERDUE_TASKS_OUTPUT_SCHEMA,
} from './get-overdue-tasks.schema.js';
import { GET_OVERDUE_TASKS_TOOL_METADATA } from './get-overdue-tasks.metadata.js';
import { filterFieldsArray } from '#tools/shared/index.js';

export class GetOverdueTasksTool extends BaseTool<TickTickFacade> {
  static override readonly METADATA = GET_OVERDUE_TASKS_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetOverdueTasksParamsSchema {
    return GetOverdueTasksParamsSchema;
  }

  /**
   * Extend auto-generated definition with title/outputSchema/annotations
   * (пакет 3.1.C.ticktick — не выводятся автоматически из METADATA, см.
   * base-tool.ts getDefinition()).
   */
  override getDefinition(): ToolDefinition {
    return {
      ...super.getDefinition(),
      title: 'Get Overdue Tasks',
      outputSchema: GET_OVERDUE_TASKS_OUTPUT_SCHEMA,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    };
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetOverdueTasksParamsSchema);
    if (!validation.success) return validation.error;

    const { fields } = validation.data;

    try {
      const tasks = await this.facade.getOverdueTasks();

      // Sort by due date (oldest first) before filtering
      tasks.sort((a, b) => {
        const dateA = new Date(a.dueDate || 0);
        const dateB = new Date(b.dueDate || 0);
        return dateA.getTime() - dateB.getTime();
      });

      const filtered = filterFieldsArray(tasks, fields);

      return this.formatSuccess({
        asOf: new Date().toISOString(),
        total: filtered.length,
        tasks: filtered,
        fieldsReturned: fields.length > 0 ? fields : 'all',
        note: 'Отсортировано по дате (самые старые первыми)',
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при получении просроченных задач', error);
    }
  }
}
