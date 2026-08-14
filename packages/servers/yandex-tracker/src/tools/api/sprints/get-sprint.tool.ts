/**
 * MCP Tool для получения одного спринта в Яндекс.Трекере
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { SprintWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetSprintParamsSchema } from './get-sprint.schema.js';

import { GET_SPRINT_TOOL_METADATA } from './get-sprint.metadata.js';

export class GetSprintTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = GET_SPRINT_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetSprintParamsSchema {
    return GetSprintParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetSprintParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { sprintId, fields } = validation.data;

    try {
      this.logger.info('Получение спринта', { sprintId });

      const sprint = await this.facade.getSprint(sprintId);

      this.logger.info('Спринт получен', { sprintId: sprint.id, name: sprint.name });

      const filtered = ResponseFieldFilter.filter<SprintWithUnknownFields>(sprint, fields);

      return this.formatSuccess({
        sprint: filtered,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при получении спринта ${sprintId}`, error);
    }
  }
}
