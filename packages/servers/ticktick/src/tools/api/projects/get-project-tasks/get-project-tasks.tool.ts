/**
 * MCP Tool for getting all tasks of a TickTick project
 */

import {
  BaseTool,
  ResponseFieldFilter,
  resolveCollectionResponseMode,
} from '@fractalizer/mcp-core';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { TickTickFacade } from '#ticktick_api/facade/ticktick.facade.js';
import type { TaskWithUnknownFields } from '#ticktick_api/entities/task.entity.js';
import { buildTaskResourceLink } from '#tools/shared/index.js';
import { GET_PROJECT_TASKS_TOOL_METADATA } from './get-project-tasks.metadata.js';
import { GetProjectTasksParamsSchema } from './get-project-tasks.schema.js';

export class GetProjectTasksTool extends BaseTool<TickTickFacade> {
  static override readonly METADATA = GET_PROJECT_TASKS_TOOL_METADATA;

  /**
   * Auto-generate definition from Zod schema
   */
  protected override getParamsSchema(): typeof GetProjectTasksParamsSchema {
    return GetProjectTasksParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetProjectTasksParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { projectId, fields, responseMode } = validation.data;

    try {
      this.logger.info('Получение задач проекта', { projectId });

      const data = await this.facade.getProjectData(projectId);

      this.logger.info('Задачи проекта получены', {
        projectId,
        projectName: data.project.name,
        tasksCount: data.tasks.length,
      });

      const resolvedMode = resolveCollectionResponseMode(responseMode, data.tasks.length);
      const items =
        resolvedMode === 'full'
          ? data.tasks.map((task) =>
              ResponseFieldFilter.filter<TaskWithUnknownFields>(task, fields)
            )
          : data.tasks;

      return this.formatCollectionResult({
        items,
        mode: resolvedMode,
        toResourceLink: buildTaskResourceLink,
        summary: { projectId, projectName: data.project.name, fieldsReturned: fields },
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при получении задач проекта', error);
    }
  }
}
