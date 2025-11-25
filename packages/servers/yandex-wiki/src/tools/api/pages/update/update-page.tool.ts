import { BaseTool, ResultLogger } from '@mcp-framework/core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { UpdatePageParamsSchema } from './update-page.schema.js';
import { UPDATE_PAGE_TOOL_METADATA } from './update-page.metadata.js';

export class UpdatePageTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = UPDATE_PAGE_TOOL_METADATA;

  protected override getParamsSchema(): typeof UpdatePageParamsSchema {
    return UpdatePageParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, UpdatePageParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx, title, content, allow_merge, fields, is_silent } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Обновление страницы', 1);

      const page = await this.facade.updatePage({
        idx,
        data: {
          ...(title !== undefined && { title }),
          ...(content !== undefined && { content }),
        },
        ...(allow_merge !== undefined && { allow_merge }),
        ...(fields !== undefined && { fields }),
        ...(is_silent !== undefined && { is_silent }),
      });

      return this.formatSuccess({
        message: `Страница ${idx} успешно обновлена`,
        page,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при обновлении страницы: ${idx}`, error);
    }
  }
}
