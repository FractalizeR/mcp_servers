import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { MoveColumnsParamsSchema } from './move-columns.schema.js';
import { MOVE_COLUMNS_TOOL_METADATA } from './move-columns.metadata.js';

export class MoveColumnsTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = MOVE_COLUMNS_TOOL_METADATA;

  protected override getParamsSchema(): typeof MoveColumnsParamsSchema {
    return MoveColumnsParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, MoveColumnsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx, column_slug, position, revision, columns_count } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Перемещение колонок', 1);

      const grid = await this.facade.moveColumns(idx, {
        column_slug,
        position,
        ...(revision !== undefined && { revision }),
        ...(columns_count !== undefined && { columns_count }),
      });

      return this.formatSuccess({
        message: `Колонка ${column_slug} перемещена в позицию ${position} в таблице ${idx}`,
        grid,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при перемещении колонок в таблице: ${idx}`, error);
    }
  }
}
