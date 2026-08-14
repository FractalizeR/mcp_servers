/**
 * MCP Tool для получения справочника статусов задач
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { StatusWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetStatusesParamsSchema } from './get-statuses.schema.js';

import { GET_STATUSES_TOOL_METADATA } from './get-statuses.metadata.js';

export class GetStatusesTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = GET_STATUSES_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetStatusesParamsSchema {
    return GetStatusesParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetStatusesParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { fields } = validation.data;

    try {
      this.logger.info('Получение справочника статусов задач');

      const result = await this.facade.getStatuses();

      const filtered = result.items.map((item) =>
        ResponseFieldFilter.filter<StatusWithUnknownFields>(item, fields)
      );

      return this.formatSuccess({
        statuses: filtered,
        count: filtered.length,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при получении справочника статусов задач', error);
    }
  }
}
