/**
 * MCP Tool для получения списка досок в Яндекс.Трекере
 *
 * ВАЖНО: до этого пакета Board/Sprint Operations и Facade методы уже
 * существовали (facade.getBoards/getBoard/createBoard/updateBoard/deleteBoard),
 * но НИ ОДИН из них не был выведен на уровень MCP Tool — агент физически не
 * мог их вызвать. Это чинится здесь как необходимое основание для колонок
 * досок и жизненного цикла спринта (пакет 7.2.B), которые без базового
 * доступа к доскам/спринтам были бы бесполезны.
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { BoardWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetBoardsParamsSchema } from './get-boards.schema.js';

import { GET_BOARDS_TOOL_METADATA } from './get-boards.metadata.js';

/**
 * Инструмент для получения списка досок
 */
export class GetBoardsTool extends BaseTool<YandexTrackerFacade> {
  static override readonly METADATA = GET_BOARDS_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetBoardsParamsSchema {
    return GetBoardsParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetBoardsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { localized, fields } = validation.data;

    try {
      this.logger.info('Получение списка досок', { localized: localized ?? true });

      const boards = await this.facade.getBoards({ localized });

      const { result: filteredBoards, fieldsWithoutValue } = ResponseFieldFilter.filterWithReport<
        readonly BoardWithUnknownFields[]
      >(boards, fields);

      this.logger.info('Список досок получен', { count: boards.length });

      return this.formatSuccess(
        {
          boards: filteredBoards,
          count: filteredBoards.length,
        },
        ResponseFieldFilter.toWarnings(fieldsWithoutValue)
      );
    } catch (error: unknown) {
      return this.formatError('Ошибка при получении списка досок', error);
    }
  }
}
