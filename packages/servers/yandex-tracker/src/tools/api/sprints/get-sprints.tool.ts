/**
 * MCP Tool для получения списка спринтов доски в Яндекс.Трекере
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { SprintWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetSprintsParamsSchema } from './get-sprints.schema.js';

import { GET_SPRINTS_TOOL_METADATA } from './get-sprints.metadata.js';

export class GetSprintsTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = GET_SPRINTS_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetSprintsParamsSchema {
    return GetSprintsParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetSprintsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { boardId, fields } = validation.data;

    try {
      this.logger.info('Получение списка спринтов доски', { boardId });

      const sprints = await this.facade.getSprints(boardId);

      const { result: filteredSprints, fieldsWithoutValue } = ResponseFieldFilter.filterWithReport<
        readonly SprintWithUnknownFields[]
      >(sprints, fields);

      this.logger.info('Список спринтов получен', { boardId, count: sprints.length });

      return this.formatSuccess(
        {
          sprints: filteredSprints,
          count: filteredSprints.length,
          boardId,
        },
        ResponseFieldFilter.toWarnings(fieldsWithoutValue)
      );
    } catch (error: unknown) {
      return this.formatError(`Ошибка при получении спринтов доски ${boardId}`, error);
    }
  }
}
