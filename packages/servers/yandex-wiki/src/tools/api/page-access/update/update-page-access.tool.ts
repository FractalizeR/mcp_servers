import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { UpdatePageAccessParamsSchema } from './update-page-access.schema.js';
import { UPDATE_PAGE_ACCESS_TOOL_METADATA } from './update-page-access.metadata.js';

export class UpdatePageAccessTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = UPDATE_PAGE_ACCESS_TOOL_METADATA;

  protected override getParamsSchema(): typeof UpdatePageAccessParamsSchema {
    return UpdatePageAccessParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, UpdatePageAccessParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx, access_id, role, inheritance, prevent_selflock } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Изменение доступа к странице', 1);

      const access = await this.facade.updatePageAccess({
        idx,
        access_id,
        data: {
          role,
          ...(inheritance !== undefined && { inheritance }),
        },
        ...(prevent_selflock !== undefined && { prevent_selflock }),
      });

      return this.formatSuccess({ idx, access });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при изменении доступа ${access_id} страницы: ${idx}`, error);
    }
  }
}
