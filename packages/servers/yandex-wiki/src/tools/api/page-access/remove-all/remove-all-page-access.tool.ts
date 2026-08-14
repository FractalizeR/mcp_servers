import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { RemoveAllPageAccessParamsSchema } from './remove-all-page-access.schema.js';
import { REMOVE_ALL_PAGE_ACCESS_TOOL_METADATA } from './remove-all-page-access.metadata.js';

export class RemoveAllPageAccessTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = REMOVE_ALL_PAGE_ACCESS_TOOL_METADATA;

  protected override getParamsSchema(): typeof RemoveAllPageAccessParamsSchema {
    return RemoveAllPageAccessParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, RemoveAllPageAccessParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx, prevent_selflock } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Удаление всех доступов к странице', 1);

      await this.facade.deleteAllPageAccesses({
        idx,
        ...(prevent_selflock !== undefined && { prevent_selflock }),
      });

      return this.formatSuccess({ idx });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при удалении всех доступов страницы: ${idx}`, error);
    }
  }
}
