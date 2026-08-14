/**
 * MCP Tool для обновления доски в Яндекс.Трекере
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { BoardWithUnknownFields } from '#tracker_api/entities/index.js';
import { UpdateBoardParamsSchema } from './update-board.schema.js';

import { UPDATE_BOARD_TOOL_METADATA } from './update-board.metadata.js';

export class UpdateBoardTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = UPDATE_BOARD_TOOL_METADATA;

  protected override getParamsSchema(): typeof UpdateBoardParamsSchema {
    return UpdateBoardParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, UpdateBoardParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { boardId, fields, ...updateData } = validation.data;

    try {
      this.logger.info('Обновление доски', { boardId });

      const board = await this.facade.updateBoard(boardId, updateData);

      this.logger.info('Доска обновлена', { boardId: board.id });

      const filtered = ResponseFieldFilter.filter<BoardWithUnknownFields>(board, fields);

      return this.formatSuccess({
        board: filtered,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при обновлении доски ${boardId}`, error);
    }
  }
}
