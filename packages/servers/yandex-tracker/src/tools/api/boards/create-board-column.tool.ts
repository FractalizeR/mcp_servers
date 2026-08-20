/**
 * MCP Tool для создания колонки доски
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { BoardColumn } from '#tracker_api/entities/index.js';
import type { WithUnknownFields } from '#tracker_api/entities/types.js';
import { CreateBoardColumnParamsSchema } from './create-board-column.schema.js';

import { CREATE_BOARD_COLUMN_TOOL_METADATA } from './create-board-column.metadata.js';

export class CreateBoardColumnTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = CREATE_BOARD_COLUMN_TOOL_METADATA;

  protected override getParamsSchema(): typeof CreateBoardColumnParamsSchema {
    return CreateBoardColumnParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, CreateBoardColumnParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { boardId, name, statuses, fields } = validation.data;

    try {
      this.logger.info('Создание колонки доски', { boardId, name });

      const created = await this.facade.createBoardColumn({ boardId, name, statuses });

      const { result: filtered, fieldsWithoutValue } = ResponseFieldFilter.filterWithReport<
        WithUnknownFields<BoardColumn>
      >(created, fields);

      return this.formatSuccess(
        {
          column: filtered,
          message: `Колонка "${name}" доски ${boardId} успешно создана`,
        },
        ResponseFieldFilter.toWarnings(fieldsWithoutValue)
      );
    } catch (error: unknown) {
      return this.formatError(`Ошибка при создании колонки доски ${boardId}`, error);
    }
  }
}
