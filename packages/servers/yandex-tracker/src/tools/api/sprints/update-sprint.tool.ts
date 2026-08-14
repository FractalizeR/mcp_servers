/**
 * MCP Tool для обновления спринта в Яндекс.Трекере
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { SprintWithUnknownFields } from '#tracker_api/entities/index.js';
import { UpdateSprintParamsSchema } from './update-sprint.schema.js';

import { UPDATE_SPRINT_TOOL_METADATA } from './update-sprint.metadata.js';

export class UpdateSprintTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = UPDATE_SPRINT_TOOL_METADATA;

  protected override getParamsSchema(): typeof UpdateSprintParamsSchema {
    return UpdateSprintParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, UpdateSprintParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { sprintId, fields, ...updateData } = validation.data;

    try {
      this.logger.info('Обновление спринта', { sprintId });

      const sprint = await this.facade.updateSprint(sprintId, updateData);

      this.logger.info('Спринт обновлён', { sprintId: sprint.id });

      const filtered = ResponseFieldFilter.filter<SprintWithUnknownFields>(sprint, fields);

      return this.formatSuccess({
        sprint: filtered,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при обновлении спринта ${sprintId}`, error);
    }
  }
}
