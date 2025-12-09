import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { CloneGridParamsSchema } from './clone-grid.schema.js';
import { CLONE_GRID_TOOL_METADATA } from './clone-grid.metadata.js';

export class CloneGridTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = CLONE_GRID_TOOL_METADATA;

  protected override getParamsSchema(): typeof CloneGridParamsSchema {
    return CloneGridParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, CloneGridParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx, target, title, with_data } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Клонирование таблицы', 1);

      const operation = await this.facade.cloneGrid(idx, {
        target,
        ...(title !== undefined && { title }),
        ...(with_data !== undefined && { with_data }),
      });

      return this.formatSuccess({
        message: `Клонирование таблицы ${idx} запущено`,
        status_url: operation.status_url,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при клонировании таблицы: ${idx}`, error);
    }
  }
}
