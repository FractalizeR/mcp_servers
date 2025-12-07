/**
 * GetTasksDueThisWeekTool - Get tasks due this week
 *
 * Retrieves all tasks with due date within current week (Monday to Sunday).
 */

import { BaseTool } from '@mcp-framework/core';
import type { TickTickFacade } from '#ticktick_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { GetTasksDueThisWeekParamsSchema } from './get-tasks-due-this-week.schema.js';
import { GET_TASKS_DUE_THIS_WEEK_TOOL_METADATA } from './get-tasks-due-this-week.metadata.js';
import { filterFieldsArray } from '#tools/shared/index.js';

export class GetTasksDueThisWeekTool extends BaseTool<TickTickFacade> {
  static override readonly METADATA = GET_TASKS_DUE_THIS_WEEK_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetTasksDueThisWeekParamsSchema {
    return GetTasksDueThisWeekParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetTasksDueThisWeekParamsSchema);
    if (!validation.success) return validation.error;

    const { fields } = validation.data;

    try {
      const tasks = await this.facade.getTasksDueThisWeek();
      const filtered = filterFieldsArray(tasks, fields);

      // Calculate Monday and Sunday of current week
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);

      return this.formatSuccess({
        weekStart: monday.toISOString().split('T')[0],
        weekEnd: sunday.toISOString().split('T')[0],
        total: filtered.length,
        tasks: filtered,
        fieldsReturned: fields.length > 0 ? fields : 'all',
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при получении задач на неделю', error);
    }
  }
}
