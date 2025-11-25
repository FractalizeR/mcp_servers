import { BaseTool, ResultLogger } from '@mcp-framework/core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { RemoveRowsParamsSchema } from './remove-rows.schema.js';
import { REMOVE_ROWS_TOOL_METADATA } from './remove-rows.metadata.js';

export class RemoveRowsTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = REMOVE_ROWS_TOOL_METADATA;

  protected override getParamsSchema(): typeof RemoveRowsParamsSchema {
    return RemoveRowsParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, RemoveRowsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx, row_ids, revision } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Удаление строк', row_ids.length);

      const grid = await this.facade.removeRows(idx, {
        row_ids,
        ...(revision !== undefined && { revision }),
      });

      return this.formatSuccess({
        message: `Удалено ${row_ids.length} строк из таблицы ${idx}`,
        grid,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при удалении строк из таблицы: ${idx}`, error);
    }
  }
}
