/**
 * MCP Tool для создания доски в Яндекс.Трекере
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { BoardWithUnknownFields } from '#tracker_api/entities/index.js';
import { CreateBoardParamsSchema } from './create-board.schema.js';

import { CREATE_BOARD_TOOL_METADATA } from './create-board.metadata.js';

export class CreateBoardTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = CREATE_BOARD_TOOL_METADATA;

  protected override getParamsSchema(): typeof CreateBoardParamsSchema {
    return CreateBoardParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, CreateBoardParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { fields, ...boardData } = validation.data;

    try {
      this.logger.info('Создание доски', { name: boardData.name, queue: boardData.queue });

      const board = await this.facade.createBoard(boardData);

      this.logger.info('Доска создана', { boardId: board.id, name: board.name });

      const filtered = ResponseFieldFilter.filter<BoardWithUnknownFields>(board, fields);

      return this.formatSuccess({
        board: filtered,
        message: `Доска "${boardData.name}" успешно создана`,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при создании доски', error);
    }
  }
}
