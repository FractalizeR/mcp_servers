import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { MoveRowsParamsSchema } from './move-rows.schema.js';
import { MOVE_ROWS_TOOL_METADATA } from './move-rows.metadata.js';

export class MoveRowsTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = MOVE_ROWS_TOOL_METADATA;

  protected override getParamsSchema(): typeof MoveRowsParamsSchema {
    return MoveRowsParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, MoveRowsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx, row_id, after_row_id, position, revision, rows_count } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Перемещение строк', 1);

      const grid = await this.facade.moveRows(idx, {
        row_id,
        ...(after_row_id !== undefined && { after_row_id }),
        ...(position !== undefined && { position }),
        ...(revision !== undefined && { revision }),
        ...(rows_count !== undefined && { rows_count }),
      });

      return this.formatSuccess({
        message: `Строка ${row_id} перемещена в таблице ${idx}`,
        grid,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при перемещении строк в таблице: ${idx}`, error);
    }
  }
}
