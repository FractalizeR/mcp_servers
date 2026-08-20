/**
 * MCP Tool для поиска записей времени по всей организации (org-wide worklog search)
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { paginatedFieldFilter } from '#common/index.js';
import type { WorklogWithUnknownFields } from '#tracker_api/entities/index.js';
import { SearchWorklogParamsSchema } from './search-worklog.schema.js';

import { SEARCH_WORKLOG_TOOL_METADATA } from './search-worklog.metadata.js';

export class SearchWorklogTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = SEARCH_WORKLOG_TOOL_METADATA;

  protected override getParamsSchema(): typeof SearchWorklogParamsSchema {
    return SearchWorklogParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, SearchWorklogParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { fields, ...searchParams } = validation.data;

    try {
      this.logger.info('Поиск worklog по организации', {
        hasCreatedBy: !!searchParams.createdBy,
      });

      const result = await this.facade.searchWorklog(searchParams);

      const filter = paginatedFieldFilter<WorklogWithUnknownFields>(fields);
      const filtered = filter(result);

      return this.formatSuccess(
        {
          worklog: filtered.items,
          count: filtered.items.length,
          pagination: filtered.pagination,
        },
        ResponseFieldFilter.toWarnings(filter.getReport().fieldsWithoutValue)
      );
    } catch (error: unknown) {
      return this.formatError('Ошибка при поиске worklog по организации', error);
    }
  }
}
