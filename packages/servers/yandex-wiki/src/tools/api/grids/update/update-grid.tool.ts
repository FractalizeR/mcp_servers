import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { UpdateGridParamsSchema } from './update-grid.schema.js';
import { UPDATE_GRID_TOOL_METADATA } from './update-grid.metadata.js';

export class UpdateGridTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = UPDATE_GRID_TOOL_METADATA;

  protected override getParamsSchema(): typeof UpdateGridParamsSchema {
    return UpdateGridParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, UpdateGridParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx, revision, title, default_sort } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Обновление таблицы', 1);

      const grid = await this.facade.updateGrid(idx, {
        revision,
        ...(title !== undefined && { title }),
        ...(default_sort !== undefined && { default_sort }),
      });

      return this.formatSuccess({
        message: `Таблица ${idx} успешно обновлена`,
        grid,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при обновлении таблицы: ${idx}`, error);
    }
  }
}
