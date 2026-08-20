/**
 * MCP Tool для обновления сохранённого фильтра
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { SavedFilterWithUnknownFields } from '#tracker_api/entities/index.js';
import { UpdateFilterParamsSchema } from './update-filter.schema.js';

import { UPDATE_FILTER_TOOL_METADATA } from './update-filter.metadata.js';

export class UpdateFilterTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = UPDATE_FILTER_TOOL_METADATA;

  protected override getParamsSchema(): typeof UpdateFilterParamsSchema {
    return UpdateFilterParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, UpdateFilterParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { filterId, name, filter, query, sorts, displayFields, groupBy, fields } =
      validation.data;

    try {
      this.logger.info('Обновление сохранённого фильтра', { filterId });

      const updated = await this.facade.updateFilter({
        filterId,
        name,
        filter,
        query,
        sorts,
        fields: displayFields,
        groupBy,
      });

      const { result: filteredResult, fieldsWithoutValue } =
        ResponseFieldFilter.filterWithReport<SavedFilterWithUnknownFields>(updated, fields);

      return this.formatSuccess(
        { filter: filteredResult },
        ResponseFieldFilter.toWarnings(fieldsWithoutValue)
      );
    } catch (error: unknown) {
      return this.formatError(`Ошибка при обновлении сохранённого фильтра ${filterId}`, error);
    }
  }
}
