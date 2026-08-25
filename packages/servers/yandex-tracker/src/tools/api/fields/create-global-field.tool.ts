/**
 * MCP Tool для создания глобального кастомного поля трекера
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { FieldWithUnknownFields } from '#tracker_api/entities/index.js';
import { CreateGlobalFieldParamsSchema } from './create-global-field.schema.js';

import { CREATE_GLOBAL_FIELD_TOOL_METADATA } from './create-global-field.metadata.js';

export class CreateGlobalFieldTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = CREATE_GLOBAL_FIELD_TOOL_METADATA;

  protected override getParamsSchema(): typeof CreateGlobalFieldParamsSchema {
    return CreateGlobalFieldParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, CreateGlobalFieldParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { fields, ...input } = validation.data;

    try {
      this.logger.info('Создание глобального поля трекера', { id: input.id });

      const created = await this.facade.createField(input);

      const { result: filtered, fieldsWithoutValue } =
        ResponseFieldFilter.filterWithReport<FieldWithUnknownFields>(created, fields);

      return this.formatSuccess(
        {
          globalField: filtered,
          message: `Глобальное поле "${created.id}" успешно создано`,
        },
        ResponseFieldFilter.toWarnings(fieldsWithoutValue)
      );
    } catch (error: unknown) {
      return this.formatError('Ошибка при создании глобального поля трекера', error);
    }
  }
}
