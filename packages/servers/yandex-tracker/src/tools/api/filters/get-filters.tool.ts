/**
 * MCP Tool для получения списка сохранённых фильтров
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { SavedFilterWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetFiltersParamsSchema } from './get-filters.schema.js';

import { GET_FILTERS_TOOL_METADATA } from './get-filters.metadata.js';

export class GetFiltersTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = GET_FILTERS_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetFiltersParamsSchema {
    return GetFiltersParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetFiltersParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { fields } = validation.data;

    try {
      this.logger.info('Получение списка сохранённых фильтров');

      const result = await this.facade.getFilters();

      const filtered = result.items.map((item) =>
        ResponseFieldFilter.filter<SavedFilterWithUnknownFields>(item, fields)
      );

      return this.formatSuccess({
        filters: filtered,
        count: filtered.length,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при получении списка сохранённых фильтров', error);
    }
  }
}
