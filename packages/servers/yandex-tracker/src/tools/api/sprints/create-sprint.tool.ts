/**
 * MCP Tool для создания спринта в Яндекс.Трекере
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { SprintWithUnknownFields } from '#tracker_api/entities/index.js';
import { CreateSprintParamsSchema } from './create-sprint.schema.js';

import { CREATE_SPRINT_TOOL_METADATA } from './create-sprint.metadata.js';

export class CreateSprintTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = CREATE_SPRINT_TOOL_METADATA;

  protected override getParamsSchema(): typeof CreateSprintParamsSchema {
    return CreateSprintParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, CreateSprintParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { fields, ...sprintData } = validation.data;

    try {
      this.logger.info('Создание спринта', { name: sprintData.name, board: sprintData.board });

      const sprint = await this.facade.createSprint(sprintData);

      this.logger.info('Спринт создан', { sprintId: sprint.id, name: sprint.name });

      const { result: filtered, fieldsWithoutValue } =
        ResponseFieldFilter.filterWithReport<SprintWithUnknownFields>(sprint, fields);

      return this.formatSuccess(
        {
          sprint: filtered,
          message: `Спринт "${sprintData.name}" успешно создан`,
        },
        ResponseFieldFilter.toWarnings(fieldsWithoutValue)
      );
    } catch (error: unknown) {
      return this.formatError('Ошибка при создании спринта', error);
    }
  }
}
