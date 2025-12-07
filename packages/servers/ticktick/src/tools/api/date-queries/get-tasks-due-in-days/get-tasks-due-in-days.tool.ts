/**
 * GetTasksDueInDaysTool - Get tasks due within N days
 *
 * Retrieves all tasks with due date within specified number of days from today.
 */

import { BaseTool } from '@mcp-framework/core';
import type { TickTickFacade } from '#ticktick_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { GetTasksDueInDaysParamsSchema } from './get-tasks-due-in-days.schema.js';
import { GET_TASKS_DUE_IN_DAYS_TOOL_METADATA } from './get-tasks-due-in-days.metadata.js';
import { filterFieldsArray } from '#tools/shared/index.js';

export class GetTasksDueInDaysTool extends BaseTool<TickTickFacade> {
  static override readonly METADATA = GET_TASKS_DUE_IN_DAYS_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetTasksDueInDaysParamsSchema {
    return GetTasksDueInDaysParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetTasksDueInDaysParamsSchema);
    if (!validation.success) return validation.error;

    const { days, fields } = validation.data;

    try {
      const tasks = await this.facade.getTasksDueInDays(days);
      const filtered = filterFieldsArray(tasks, fields);

      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + days);

      return this.formatSuccess({
        fromDate: today.toISOString().split('T')[0],
        toDate: endDate.toISOString().split('T')[0],
        daysRange: days,
        total: filtered.length,
        tasks: filtered,
        fieldsReturned: fields.length > 0 ? fields : 'all',
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при получении задач на ${days} дней`, error);
    }
  }
}
