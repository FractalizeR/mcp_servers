/**
 * MCP Tool для получения списка глобальных полей трекера
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { FieldWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetGlobalFieldsParamsSchema } from './get-global-fields.schema.js';

import { GET_GLOBAL_FIELDS_TOOL_METADATA } from './get-global-fields.metadata.js';

export class GetGlobalFieldsTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = GET_GLOBAL_FIELDS_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetGlobalFieldsParamsSchema {
    return GetGlobalFieldsParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetGlobalFieldsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { fields } = validation.data;

    try {
      this.logger.info('Получение списка глобальных полей трекера');

      const result = await this.facade.getFields();

      const { result: filtered, fieldsWithoutValue } = ResponseFieldFilter.filterWithReport<
        readonly FieldWithUnknownFields[]
      >(result, fields);

      return this.formatSuccess(
        {
          globalFields: filtered,
          count: filtered.length,
        },
        ResponseFieldFilter.toWarnings(fieldsWithoutValue)
      );
    } catch (error: unknown) {
      return this.formatError('Ошибка при получении списка глобальных полей трекера', error);
    }
  }
}
