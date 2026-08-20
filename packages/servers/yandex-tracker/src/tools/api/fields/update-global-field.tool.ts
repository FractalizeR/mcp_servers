/**
 * MCP Tool для обновления глобального поля трекера
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { FieldWithUnknownFields } from '#tracker_api/entities/index.js';
import { UpdateGlobalFieldParamsSchema } from './update-global-field.schema.js';

import { UPDATE_GLOBAL_FIELD_TOOL_METADATA } from './update-global-field.metadata.js';

export class UpdateGlobalFieldTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = UPDATE_GLOBAL_FIELD_TOOL_METADATA;

  protected override getParamsSchema(): typeof UpdateGlobalFieldParamsSchema {
    return UpdateGlobalFieldParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, UpdateGlobalFieldParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { fieldId, fields, ...updateData } = validation.data;

    try {
      this.logger.info('Обновление глобального поля трекера', { fieldId });

      const updated = await this.facade.updateField(fieldId, updateData);

      const { result: filtered, fieldsWithoutValue } =
        ResponseFieldFilter.filterWithReport<FieldWithUnknownFields>(updated, fields);

      return this.formatSuccess(
        { globalField: filtered },
        ResponseFieldFilter.toWarnings(fieldsWithoutValue)
      );
    } catch (error: unknown) {
      return this.formatError(`Ошибка при обновлении глобального поля ${fieldId}`, error);
    }
  }
}
