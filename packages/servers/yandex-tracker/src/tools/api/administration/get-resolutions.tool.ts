/**
 * MCP Tool для получения справочника резолюций задач
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { ResolutionWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetResolutionsParamsSchema } from './get-resolutions.schema.js';

import { GET_RESOLUTIONS_TOOL_METADATA } from './get-resolutions.metadata.js';

export class GetResolutionsTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = GET_RESOLUTIONS_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetResolutionsParamsSchema {
    return GetResolutionsParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetResolutionsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { fields } = validation.data;

    try {
      this.logger.info('Получение справочника резолюций задач');

      const result = await this.facade.getResolutions();

      const { result: filtered, fieldsWithoutValue } = ResponseFieldFilter.filterWithReport<
        ResolutionWithUnknownFields[]
      >(result.items, fields);

      return this.formatSuccess(
        {
          resolutions: filtered,
          count: filtered.length,
        },
        ResponseFieldFilter.toWarnings(fieldsWithoutValue)
      );
    } catch (error: unknown) {
      return this.formatError('Ошибка при получении справочника резолюций задач', error);
    }
  }
}
