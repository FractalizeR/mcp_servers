import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { DeleteGridParamsSchema } from './delete-grid.schema.js';
import { DELETE_GRID_TOOL_METADATA } from './delete-grid.metadata.js';
export class DeleteGridTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = DELETE_GRID_TOOL_METADATA;

  protected override getParamsSchema(): typeof DeleteGridParamsSchema {
    return DeleteGridParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, DeleteGridParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Удаление таблицы', 1);

      await this.facade.deleteGrid(idx);

      return this.formatSuccess({
        message: `Таблица ${idx} успешно удалена. Восстановление невозможно: в отличие от удаления страницы, API удаления таблицы не возвращает recovery_token.`,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при удалении таблицы: ${idx}`, error);
    }
  }
}
