/**
 * MCP Tool для получения списка колонок доски
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { BoardColumn } from '#tracker_api/entities/index.js';
import type { WithUnknownFields } from '#tracker_api/entities/types.js';
import { GetBoardColumnsParamsSchema } from './get-board-columns.schema.js';

import { GET_BOARD_COLUMNS_TOOL_METADATA } from './get-board-columns.metadata.js';

export class GetBoardColumnsTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = GET_BOARD_COLUMNS_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetBoardColumnsParamsSchema {
    return GetBoardColumnsParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetBoardColumnsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { boardId, fields } = validation.data;

    try {
      this.logger.info('Получение колонок доски', { boardId });

      const result = await this.facade.getBoardColumns({ boardId });

      const filtered = result.items.map((item) =>
        ResponseFieldFilter.filter<WithUnknownFields<BoardColumn>>(item, fields)
      );

      return this.formatSuccess({
        columns: filtered,
        count: filtered.length,
        boardId,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при получении колонок доски ${boardId}`, error);
    }
  }
}
