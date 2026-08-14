import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { RemovePageAccessParamsSchema } from './remove-page-access.schema.js';
import { REMOVE_PAGE_ACCESS_TOOL_METADATA } from './remove-page-access.metadata.js';

export class RemovePageAccessTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = REMOVE_PAGE_ACCESS_TOOL_METADATA;

  protected override getParamsSchema(): typeof RemovePageAccessParamsSchema {
    return RemovePageAccessParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, RemovePageAccessParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx, access_id, prevent_selflock } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Удаление доступа к странице', 1);

      await this.facade.deletePageAccess({
        idx,
        access_id,
        ...(prevent_selflock !== undefined && { prevent_selflock }),
      });

      return this.formatSuccess({ idx, access_id });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при удалении доступа ${access_id} страницы: ${idx}`, error);
    }
  }
}
