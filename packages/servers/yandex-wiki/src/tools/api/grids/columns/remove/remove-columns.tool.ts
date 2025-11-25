import { BaseTool, ResultLogger } from '@mcp-framework/core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { RemoveColumnsParamsSchema } from './remove-columns.schema.js';
import { REMOVE_COLUMNS_TOOL_METADATA } from './remove-columns.metadata.js';

export class RemoveColumnsTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = REMOVE_COLUMNS_TOOL_METADATA;

  protected override getParamsSchema(): typeof RemoveColumnsParamsSchema {
    return RemoveColumnsParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, RemoveColumnsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx, column_slugs, revision } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Удаление колонок', column_slugs.length);

      const grid = await this.facade.removeColumns(idx, {
        column_slugs,
        ...(revision !== undefined && { revision }),
      });

      return this.formatSuccess({
        message: `Удалено ${column_slugs.length} колонок из таблицы ${idx}`,
        grid,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при удалении колонок из таблицы: ${idx}`, error);
    }
  }
}
