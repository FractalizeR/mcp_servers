/**
 * MCP Tool для обновления колонки доски
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { BoardColumn } from '#tracker_api/entities/index.js';
import type { WithUnknownFields } from '#tracker_api/entities/types.js';
import { UpdateBoardColumnParamsSchema } from './update-board-column.schema.js';

import { UPDATE_BOARD_COLUMN_TOOL_METADATA } from './update-board-column.metadata.js';

export class UpdateBoardColumnTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = UPDATE_BOARD_COLUMN_TOOL_METADATA;

  protected override getParamsSchema(): typeof UpdateBoardColumnParamsSchema {
    return UpdateBoardColumnParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, UpdateBoardColumnParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { boardId, columnId, fields, ...updateData } = validation.data;

    try {
      this.logger.info('Обновление колонки доски', { boardId, columnId });

      const updated = await this.facade.updateBoardColumn({ boardId, columnId, ...updateData });

      const { result: filtered, fieldsWithoutValue } = ResponseFieldFilter.filterWithReport<
        WithUnknownFields<BoardColumn>
      >(updated, fields);

      return this.formatSuccess(
        {
          column: filtered,
        },
        ResponseFieldFilter.toWarnings(fieldsWithoutValue)
      );
    } catch (error: unknown) {
      return this.formatError(`Ошибка при обновлении колонки ${columnId} доски ${boardId}`, error);
    }
  }
}
