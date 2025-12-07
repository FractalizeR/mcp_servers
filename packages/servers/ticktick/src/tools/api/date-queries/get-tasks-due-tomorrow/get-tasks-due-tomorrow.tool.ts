/**
 * GetTasksDueTomorrowTool - Get tasks due tomorrow
 *
 * Retrieves all tasks with due date set to tomorrow.
 */

import { BaseTool } from '@mcp-framework/core';
import type { TickTickFacade } from '#ticktick_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { GetTasksDueTomorrowParamsSchema } from './get-tasks-due-tomorrow.schema.js';
import { GET_TASKS_DUE_TOMORROW_TOOL_METADATA } from './get-tasks-due-tomorrow.metadata.js';
import { filterFieldsArray } from '#tools/shared/index.js';

export class GetTasksDueTomorrowTool extends BaseTool<TickTickFacade> {
  static override readonly METADATA = GET_TASKS_DUE_TOMORROW_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetTasksDueTomorrowParamsSchema {
    return GetTasksDueTomorrowParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetTasksDueTomorrowParamsSchema);
    if (!validation.success) return validation.error;

    const { fields } = validation.data;

    try {
      const tasks = await this.facade.getTasksDueTomorrow();
      const filtered = filterFieldsArray(tasks, fields);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      return this.formatSuccess({
        date: dateStr,
        total: filtered.length,
        tasks: filtered,
        fieldsReturned: fields.length > 0 ? fields : 'all',
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при получении задач на завтра', error);
    }
  }
}
