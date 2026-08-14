/**
 * GetOverdueTasksTool - Get overdue tasks
 *
 * Retrieves all tasks that are past due date and not completed.
 * Results are sorted by due date (oldest first).
 */

import { BaseTool, resolveCollectionResponseMode } from '@fractalizer/mcp-core';
import type { TickTickFacade } from '#ticktick_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { GetOverdueTasksParamsSchema } from './get-overdue-tasks.schema.js';
import { GET_OVERDUE_TASKS_TOOL_METADATA } from './get-overdue-tasks.metadata.js';
import { filterFieldsArray, buildTaskResourceLink } from '#tools/shared/index.js';

export class GetOverdueTasksTool extends BaseTool<TickTickFacade> {
  static override readonly METADATA = GET_OVERDUE_TASKS_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetOverdueTasksParamsSchema {
    return GetOverdueTasksParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetOverdueTasksParamsSchema);
    if (!validation.success) return validation.error;

    const { fields, responseMode } = validation.data;

    try {
      const tasks = await this.facade.getOverdueTasks();

      // Sort by due date (oldest first) before filtering/linking
      tasks.sort((a, b) => {
        const dateA = new Date(a.dueDate || 0);
        const dateB = new Date(b.dueDate || 0);
        return dateA.getTime() - dateB.getTime();
      });

      const resolvedMode = resolveCollectionResponseMode(responseMode, tasks.length);
      const items = resolvedMode === 'full' ? filterFieldsArray(tasks, fields) : tasks;

      return this.formatCollectionResult({
        items,
        mode: resolvedMode,
        toResourceLink: buildTaskResourceLink,
        summary: {
          asOf: new Date().toISOString(),
          fieldsReturned: fields.length > 0 ? fields : 'all',
          note: 'Отсортировано по дате (самые старые первыми)',
        },
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при получении просроченных задач', error);
    }
  }
}
