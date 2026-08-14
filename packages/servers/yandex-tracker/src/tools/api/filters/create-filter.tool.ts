/**
 * MCP Tool для создания сохранённого фильтра
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { SavedFilterWithUnknownFields } from '#tracker_api/entities/index.js';
import { CreateFilterParamsSchema } from './create-filter.schema.js';

import { CREATE_FILTER_TOOL_METADATA } from './create-filter.metadata.js';

export class CreateFilterTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = CREATE_FILTER_TOOL_METADATA;

  protected override getParamsSchema(): typeof CreateFilterParamsSchema {
    return CreateFilterParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, CreateFilterParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { name, filter, query, sorts, displayFields, groupBy, fields } = validation.data;

    try {
      this.logger.info('Создание сохранённого фильтра', { name });

      const created = await this.facade.createFilter({
        name,
        filter,
        query,
        sorts,
        fields: displayFields,
        groupBy,
      });

      const filtered = ResponseFieldFilter.filter<SavedFilterWithUnknownFields>(created, fields);

      return this.formatSuccess({
        filter: filtered,
        message: `Фильтр "${name}" успешно создан`,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при создании сохранённого фильтра', error);
    }
  }
}
