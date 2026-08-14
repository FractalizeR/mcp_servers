import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { ToolDefinition } from '@fractalizer/mcp-core';
import { UpdateCellsParamsSchema, UpdateCellsOutputDataSchema } from './update-cells.schema.js';
import { UPDATE_CELLS_TOOL_METADATA } from './update-cells.metadata.js';
import {
  withDefinitionExtras,
  buildOutputSchema,
} from '../../../../shared/tool-definition-extras.js';

export class UpdateCellsTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = UPDATE_CELLS_TOOL_METADATA;

  protected override getParamsSchema(): typeof UpdateCellsParamsSchema {
    return UpdateCellsParamsSchema;
  }

  override getDefinition(): ToolDefinition {
    return withDefinitionExtras(super.getDefinition(), {
      title: 'Обновить ячейки таблицы',
      outputSchema: buildOutputSchema(UpdateCellsOutputDataSchema),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    });
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, UpdateCellsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx, cells, revision } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Обновление ячеек', cells.length);

      const grid = await this.facade.updateCells(idx, {
        cells,
        ...(revision !== undefined && { revision }),
      });

      return this.formatSuccess({
        message: `Обновлено ${cells.length} ячеек в таблице ${idx}`,
        grid,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при обновлении ячеек в таблице: ${idx}`, error);
    }
  }
}
