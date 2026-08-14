/**
 * GetTasksDueTomorrowTool - Get tasks due tomorrow
 *
 * Retrieves all tasks with due date set to tomorrow.
 */

import { BaseTool } from '@fractalizer/mcp-core';
import type { ToolDefinition } from '@fractalizer/mcp-core';
import type { TickTickFacade } from '#ticktick_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import {
  GetTasksDueTomorrowParamsSchema,
  GET_TASKS_DUE_TOMORROW_OUTPUT_SCHEMA,
} from './get-tasks-due-tomorrow.schema.js';
import { GET_TASKS_DUE_TOMORROW_TOOL_METADATA } from './get-tasks-due-tomorrow.metadata.js';
import { filterFieldsArray } from '#tools/shared/index.js';

export class GetTasksDueTomorrowTool extends BaseTool<TickTickFacade> {
  static override readonly METADATA = GET_TASKS_DUE_TOMORROW_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetTasksDueTomorrowParamsSchema {
    return GetTasksDueTomorrowParamsSchema;
  }

  /**
   * Extend auto-generated definition with title/outputSchema/annotations
   * (пакет 3.1.C.ticktick — не выводятся автоматически из METADATA, см.
   * base-tool.ts getDefinition()).
   */
  override getDefinition(): ToolDefinition {
    return {
      ...super.getDefinition(),
      title: 'Get Tasks Due Tomorrow',
      outputSchema: GET_TASKS_DUE_TOMORROW_OUTPUT_SCHEMA,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    };
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
