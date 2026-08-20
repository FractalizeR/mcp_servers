/**
 * MCP Tool для получения одной доски в Яндекс.Трекере
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { BoardWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetBoardParamsSchema } from './get-board.schema.js';

import { GET_BOARD_TOOL_METADATA } from './get-board.metadata.js';

export class GetBoardTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = GET_BOARD_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetBoardParamsSchema {
    return GetBoardParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetBoardParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { boardId, localized, fields } = validation.data;

    try {
      this.logger.info('Получение доски', { boardId });

      const board = await this.facade.getBoard(boardId, { localized });

      this.logger.info('Доска получена', { boardId: board.id, name: board.name });

      const { result: filteredBoard, fieldsWithoutValue } =
        ResponseFieldFilter.filterWithReport<BoardWithUnknownFields>(board, fields);

      return this.formatSuccess(
        {
          board: filteredBoard,
        },
        ResponseFieldFilter.toWarnings(fieldsWithoutValue)
      );
    } catch (error: unknown) {
      return this.formatError(`Ошибка при получении доски ${boardId}`, error);
    }
  }
}
