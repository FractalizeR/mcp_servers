/**
 * GetTasksDueTodayTool - Get tasks due today
 *
 * Retrieves all tasks with due date set to today.
 */

import { BaseTool, resolveCollectionResponseMode } from '@fractalizer/mcp-core';
import type { TickTickFacade } from '#ticktick_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { GetTasksDueTodayParamsSchema } from './get-tasks-due-today.schema.js';
import { GET_TASKS_DUE_TODAY_TOOL_METADATA } from './get-tasks-due-today.metadata.js';
import { filterFieldsArray, buildTaskResourceLink } from '#tools/shared/index.js';

export class GetTasksDueTodayTool extends BaseTool<TickTickFacade> {
  static override readonly METADATA = GET_TASKS_DUE_TODAY_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetTasksDueTodayParamsSchema {
    return GetTasksDueTodayParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetTasksDueTodayParamsSchema);
    if (!validation.success) return validation.error;

    const { fields, responseMode } = validation.data;

    try {
      const tasks = await this.facade.getTasksDueToday();

      // Resolve links/full mode BEFORE field-filtering (см. get-all-tasks.tool.ts)
      const resolvedMode = resolveCollectionResponseMode(responseMode, tasks.length);
      const items = resolvedMode === 'full' ? filterFieldsArray(tasks, fields) : tasks;

      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];

      return this.formatCollectionResult({
        items,
        mode: resolvedMode,
        toResourceLink: buildTaskResourceLink,
        summary: { date: dateStr, fieldsReturned: fields.length > 0 ? fields : 'all' },
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при получении задач на сегодня', error);
    }
  }
}
