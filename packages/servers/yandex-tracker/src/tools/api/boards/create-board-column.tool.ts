/**
 * MCP Tool для создания колонки доски
 */

import { BaseTool, ResponseFieldFilter, ToolWarningCode } from '@fractalizer/mcp-core';
import type { ToolWarning } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { findColumnsSharingId } from '#tracker_api/entities/index.js';
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

    let created: WithUnknownFields<BoardColumn>;
    try {
      this.logger.info('Создание колонки доски', { boardId, name });
      created = await this.facade.createBoardColumn({ boardId, name, statuses });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при создании колонки доски ${boardId}`, error);
    }

    const { result: filtered, fieldsWithoutValue } = ResponseFieldFilter.filterWithReport<
      WithUnknownFields<BoardColumn>
    >(created, fields);

    // Мутация уже прошла — сбой ДИАГНОСТИКИ ниже (её единственная задача —
    // предупредить о коллизии id) не должен превращать успешное создание в
    // formatError: колонка на боевой доске уже есть, отчёт об ошибке был бы
    // ложью о состоянии данных (зеркало D9, ради которого чинится вся задача).
    const { warning: duplicateIdWarning, checkFailed } = await this.detectDuplicateColumnId(
      boardId,
      created
    );

    return this.formatSuccess(
      {
        column: filtered,
        message: checkFailed
          ? `Колонка "${name}" доски ${boardId} успешно создана; проверить уникальность её id не удалось`
          : `Колонка "${name}" доски ${boardId} успешно создана`,
      },
      [
        ...ResponseFieldFilter.toWarnings(fieldsWithoutValue),
        ...(duplicateIdWarning ? [duplicateIdWarning] : []),
      ]
    );
  }

  /**
   * `id` колонки не уникален внутри доски (D11, боевое наблюдение —
   * `0_CONTRACTS.md`): создание может отдать колонку с `id`, который уже
   * занят другой колонкой доски. Такая колонка станет неадресуемой для
   * `update_board_column`/`delete_board_column` (обе отказывают при
   * неоднозначном `columnId`) — предупреждаем сразу после создания, а не
   * ждём первой попытки её изменить.
   */
  private async detectDuplicateColumnId(
    boardId: string,
    created: WithUnknownFields<BoardColumn>
  ): Promise<{ warning?: ToolWarning; checkFailed: boolean }> {
    let columns: ReadonlyArray<WithUnknownFields<BoardColumn>>;
    try {
      ({ items: columns } = await this.facade.getBoardColumns({ boardId }));
    } catch (error: unknown) {
      this.logger.warn('Не удалось проверить созданную колонку на коллизию id', {
        boardId,
        columnId: created.id,
        error,
      });
      return { checkFailed: true };
    }

    const sharingId = findColumnsSharingId(columns, String(created.id));

    if (sharingId.length <= 1) {
      return { checkFailed: false };
    }

    const candidateNames = sharingId.map((column) => `"${column.name}"`).join(', ');
    return {
      checkFailed: false,
      warning: {
        code: ToolWarningCode.AMBIGUOUS_ENTITY_ID,
        message:
          `На доске ${boardId} теперь ${String(sharingId.length)} колонки с id=${String(created.id)} ` +
          `(${candidateNames}) — созданная колонка неадресуема по id: update_board_column и ` +
          `delete_board_column откажут при обращении к этому id.`,
        details: {
          boardId,
          columnId: created.id,
          candidateNames: sharingId.map((column) => column.name),
        },
      },
    };
  }
}
