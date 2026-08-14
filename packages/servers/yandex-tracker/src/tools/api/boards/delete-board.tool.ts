/**
 * MCP Tool для удаления доски в Яндекс.Трекере
 */

import { BaseTool } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { DeleteBoardParamsSchema } from './delete-board.schema.js';

import { DELETE_BOARD_TOOL_METADATA } from './delete-board.metadata.js';

export class DeleteBoardTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = DELETE_BOARD_TOOL_METADATA;

  protected override getParamsSchema(): typeof DeleteBoardParamsSchema {
    return DeleteBoardParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, DeleteBoardParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { boardId } = validation.data;

    try {
      this.logger.info('Удаление доски', { boardId });

      await this.facade.deleteBoard(boardId);

      this.logger.info('Доска удалена', { boardId });

      return this.formatSuccess({
        success: true,
        boardId,
        message: `Доска ${boardId} успешно удалена`,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при удалении доски ${boardId}`, error);
    }
  }
}
