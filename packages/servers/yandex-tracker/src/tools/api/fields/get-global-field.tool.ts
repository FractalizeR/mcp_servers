/**
 * MCP Tool для получения глобального поля трекера по ID
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { FieldWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetGlobalFieldParamsSchema } from './get-global-field.schema.js';

import { GET_GLOBAL_FIELD_TOOL_METADATA } from './get-global-field.metadata.js';

export class GetGlobalFieldTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = GET_GLOBAL_FIELD_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetGlobalFieldParamsSchema {
    return GetGlobalFieldParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetGlobalFieldParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { fieldId, fields } = validation.data;

    try {
      this.logger.info('Получение глобального поля трекера', { fieldId });

      const field = await this.facade.getField(fieldId);

      const filtered = ResponseFieldFilter.filter<FieldWithUnknownFields>(field, fields);

      return this.formatSuccess({
        globalField: filtered,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при получении глобального поля ${fieldId}`, error);
    }
  }
}
