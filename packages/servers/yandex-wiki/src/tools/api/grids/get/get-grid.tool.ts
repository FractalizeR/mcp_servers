import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { GetGridParamsSchema } from './get-grid.schema.js';
import { GET_GRID_TOOL_METADATA } from './get-grid.metadata.js';

export class GetGridTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = GET_GRID_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetGridParamsSchema {
    return GetGridParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetGridParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx, fields, filter, only_cols, only_rows, sort } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Получение таблицы', 1);

      const grid = await this.facade.getGrid({
        idx,
        ...(fields !== undefined && { fields }),
        ...(filter !== undefined && { filter }),
        ...(only_cols !== undefined && { only_cols }),
        ...(only_rows !== undefined && { only_rows }),
        ...(sort !== undefined && { sort }),
      });

      return this.formatSuccess({
        message: `Таблица ${idx} получена`,
        grid,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при получении таблицы: ${idx}`, error);
    }
  }
}
