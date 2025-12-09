import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { CreatePageParamsSchema } from './create-page.schema.js';
import { CREATE_PAGE_TOOL_METADATA } from './create-page.metadata.js';

export class CreatePageTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = CREATE_PAGE_TOOL_METADATA;

  protected override getParamsSchema(): typeof CreatePageParamsSchema {
    return CreatePageParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, CreatePageParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { page_type, slug, title, content, grid_format, fields, is_silent } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Создание страницы', 1);

      const page = await this.facade.createPage({
        data: {
          page_type,
          slug,
          title,
          ...(content !== undefined && { content }),
          ...(grid_format !== undefined && { grid_format }),
        },
        ...(fields !== undefined && { fields }),
        ...(is_silent !== undefined && { is_silent }),
      });

      return this.formatSuccess({
        message: `Страница "${title}" успешно создана`,
        page,
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при создании страницы: ${slug}`, error);
    }
  }
}
