/**
 * GetEngagedTasksTool - Get "engaged" tasks (GTD methodology)
 *
 * Returns tasks that require immediate attention:
 * - High priority tasks (priority = 5)
 * - Overdue tasks
 *
 * Duplicates are removed.
 */

import { BaseTool } from '@fractalizer/mcp-core';
import type { TickTickFacade } from '#ticktick_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/index.js';
import { GetEngagedTasksParamsSchema } from './get-engaged-tasks.schema.js';
import { GET_ENGAGED_TASKS_TOOL_METADATA } from './get-engaged-tasks.metadata.js';
import { filterFieldsArray } from '#tools/shared/index.js';

export class GetEngagedTasksTool extends BaseTool<TickTickFacade> {
  static override readonly METADATA = GET_ENGAGED_TASKS_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetEngagedTasksParamsSchema {
    return GetEngagedTasksParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetEngagedTasksParamsSchema);
    if (!validation.success) return validation.error;

    const { fields } = validation.data;

    try {
      // Fetch both sets in parallel
      const [highPriority, overdue] = await Promise.all([
        this.facade.getTasksByPriority(5), // priority 5 = high
        this.facade.getOverdueTasks(),
      ]);

      // Merge and deduplicate by task ID
      const taskMap = new Map<string, TaskWithUnknownFields>();
      for (const task of [...highPriority, ...overdue]) {
        taskMap.set(task.id, task);
      }

      const tasks = Array.from(taskMap.values());
      const filtered = filterFieldsArray(tasks, fields);

      return this.formatSuccess({
        description: 'Высокий приоритет ИЛИ просроченные',
        highPriorityCount: highPriority.length,
        overdueCount: overdue.length,
        total: filtered.length,
        tasks: filtered,
        fieldsReturned: fields.length > 0 ? fields : 'all',
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при получении "горящих" задач', error);
    }
  }
}
