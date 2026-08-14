/**
 * GetTasksDueTomorrowTool - Get tasks due tomorrow
 *
 * Retrieves all tasks with due date set to tomorrow.
 */

import { BaseTool, resolveCollectionResponseMode } from '@fractalizer/mcp-core';
import type { TickTickFacade } from '#ticktick_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { GetTasksDueTomorrowParamsSchema } from './get-tasks-due-tomorrow.schema.js';
import { GET_TASKS_DUE_TOMORROW_TOOL_METADATA } from './get-tasks-due-tomorrow.metadata.js';
import { filterFieldsArray, buildTaskResourceLink } from '#tools/shared/index.js';

export class GetTasksDueTomorrowTool extends BaseTool<TickTickFacade> {
  static override readonly METADATA = GET_TASKS_DUE_TOMORROW_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetTasksDueTomorrowParamsSchema {
    return GetTasksDueTomorrowParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetTasksDueTomorrowParamsSchema);
    if (!validation.success) return validation.error;

    const { fields, responseMode } = validation.data;

    try {
      const tasks = await this.facade.getTasksDueTomorrow();

      const resolvedMode = resolveCollectionResponseMode(responseMode, tasks.length);
      const items = resolvedMode === 'full' ? filterFieldsArray(tasks, fields) : tasks;

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      return this.formatCollectionResult({
        items,
        mode: resolvedMode,
        toResourceLink: buildTaskResourceLink,
        summary: { date: dateStr, fieldsReturned: fields.length > 0 ? fields : 'all' },
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при получении задач на завтра', error);
    }
  }
}
