/**
 * MCP Tool для удаления колонки доски
 */

import { BaseTool } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { DeleteBoardColumnParamsSchema } from './delete-board-column.schema.js';

import { DELETE_BOARD_COLUMN_TOOL_METADATA } from './delete-board-column.metadata.js';

export class DeleteBoardColumnTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = DELETE_BOARD_COLUMN_TOOL_METADATA;

  protected override getParamsSchema(): typeof DeleteBoardColumnParamsSchema {
    return DeleteBoardColumnParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, DeleteBoardColumnParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { boardId, columnId } = validation.data;

    try {
      this.logger.info('Удаление колонки доски', { boardId, columnId });

      await this.facade.deleteBoardColumn({ boardId, columnId });

      return this.formatSuccess({
        success: true,
        boardId,
        columnId,
        message: `Колонка ${columnId} доски ${boardId} успешно удалена`,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при удалении колонки ${columnId} доски ${boardId}`, error);
    }
  }
}
