/**
 * GetEngagedTasksTool - Get "engaged" tasks (GTD methodology)
 *
 * Returns tasks that require immediate attention:
 * - High priority tasks (priority = 5)
 * - Overdue tasks
 *
 * Duplicates are removed.
 */

import { BaseTool, resolveCollectionResponseMode } from '@fractalizer/mcp-core';
import type { TickTickFacade } from '#ticktick_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/index.js';
import { GetEngagedTasksParamsSchema } from './get-engaged-tasks.schema.js';
import { GET_ENGAGED_TASKS_TOOL_METADATA } from './get-engaged-tasks.metadata.js';
import { filterFieldsArray, buildTaskResourceLink } from '#tools/shared/index.js';

export class GetEngagedTasksTool extends BaseTool<TickTickFacade> {
  static override readonly METADATA = GET_ENGAGED_TASKS_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetEngagedTasksParamsSchema {
    return GetEngagedTasksParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetEngagedTasksParamsSchema);
    if (!validation.success) return validation.error;

    const { fields, responseMode } = validation.data;

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

      const resolvedMode = resolveCollectionResponseMode(responseMode, tasks.length);
      const items = resolvedMode === 'full' ? filterFieldsArray(tasks, fields) : tasks;

      return this.formatCollectionResult({
        items,
        mode: resolvedMode,
        toResourceLink: buildTaskResourceLink,
        summary: {
          description: 'Высокий приоритет ИЛИ просроченные',
          highPriorityCount: highPriority.length,
          overdueCount: overdue.length,
          fieldsReturned: fields.length > 0 ? fields : 'all',
        },
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при получении "горящих" задач', error);
    }
  }
}
