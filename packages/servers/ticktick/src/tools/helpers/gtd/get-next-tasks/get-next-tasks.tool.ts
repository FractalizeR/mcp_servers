/**
 * GetNextTasksTool - Get "next" tasks (GTD methodology)
 *
 * Returns tasks that should be addressed soon:
 * - Medium priority tasks (priority = 3)
 * - Tasks due tomorrow
 *
 * Duplicates are removed.
 */

import { BaseTool } from '@fractalizer/mcp-core';
import type { TickTickFacade } from '#ticktick_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/index.js';
import { GetNextTasksParamsSchema } from './get-next-tasks.schema.js';
import { GET_NEXT_TASKS_TOOL_METADATA } from './get-next-tasks.metadata.js';
import { filterFieldsArray } from '#tools/shared/index.js';

export class GetNextTasksTool extends BaseTool<TickTickFacade> {
  static override readonly METADATA = GET_NEXT_TASKS_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetNextTasksParamsSchema {
    return GetNextTasksParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetNextTasksParamsSchema);
    if (!validation.success) return validation.error;

    const { fields } = validation.data;

    try {
      // Fetch both sets in parallel
      const [mediumPriority, dueTomorrow] = await Promise.all([
        this.facade.getTasksByPriority(3), // priority 3 = medium
        this.facade.getTasksDueTomorrow(),
      ]);

      // Merge and deduplicate by task ID
      const taskMap = new Map<string, TaskWithUnknownFields>();
      for (const task of [...mediumPriority, ...dueTomorrow]) {
        taskMap.set(task.id, task);
      }

      const tasks = Array.from(taskMap.values());
      const filtered = filterFieldsArray(tasks, fields);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      return this.formatSuccess({
        description: 'Средний приоритет ИЛИ срок завтра',
        mediumPriorityCount: mediumPriority.length,
        dueTomorrowCount: dueTomorrow.length,
        tomorrowDate: tomorrow.toISOString().split('T')[0],
        total: filtered.length,
        tasks: filtered,
        fieldsReturned: fields.length > 0 ? fields : 'all',
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при получении "следующих" задач', error);
    }
  }
}
