/**
 * MCP Tool для получения справочника приоритетов задач
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { PriorityWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetPrioritiesParamsSchema } from './get-priorities.schema.js';

import { GET_PRIORITIES_TOOL_METADATA } from './get-priorities.metadata.js';

export class GetPrioritiesTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = GET_PRIORITIES_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetPrioritiesParamsSchema {
    return GetPrioritiesParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetPrioritiesParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { fields } = validation.data;

    try {
      this.logger.info('Получение справочника приоритетов задач');

      const result = await this.facade.getPriorities();

      const { result: filtered, fieldsWithoutValue } = ResponseFieldFilter.filterWithReport<
        PriorityWithUnknownFields[]
      >(result.items, fields);

      return this.formatSuccess(
        {
          priorities: filtered,
          count: filtered.length,
        },
        ResponseFieldFilter.toWarnings(fieldsWithoutValue)
      );
    } catch (error: unknown) {
      return this.formatError('Ошибка при получении справочника приоритетов задач', error);
    }
  }
}
