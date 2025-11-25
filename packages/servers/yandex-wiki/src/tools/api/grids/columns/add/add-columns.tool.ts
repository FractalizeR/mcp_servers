import { BaseTool, ResultLogger } from '@mcp-framework/core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { AddColumnsParamsSchema } from './add-columns.schema.js';
import { ADD_COLUMNS_TOOL_METADATA } from './add-columns.metadata.js';

export class AddColumnsTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = ADD_COLUMNS_TOOL_METADATA;

  protected override getParamsSchema(): typeof AddColumnsParamsSchema {
    return AddColumnsParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, AddColumnsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx, columns, revision, position } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Добавление колонок', columns.length);

      const grid = await this.facade.addColumns(idx, {
        columns,
        ...(revision !== undefined && { revision }),
        ...(position !== undefined && { position }),
      });

      return this.formatSuccess({
        message: `Добавлено ${columns.length} колонок в таблицу ${idx}`,
        grid,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при добавлении колонок в таблицу: ${idx}`, error);
    }
  }
}
