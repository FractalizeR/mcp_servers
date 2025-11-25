import { BaseTool, ResultLogger } from '@mcp-framework/core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { GetPageParamsSchema } from './get-page.schema.js';
import { GET_PAGE_TOOL_METADATA } from './get-page.metadata.js';

export class GetPageTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = GET_PAGE_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetPageParamsSchema {
    return GetPageParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetPageParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { slug, fields, raise_on_redirect, revision_id } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Получение страницы', 1);

      const page = await this.facade.getPage({
        slug,
        ...(fields !== undefined && { fields }),
        ...(raise_on_redirect !== undefined && { raise_on_redirect }),
        ...(revision_id !== undefined && { revision_id }),
      });

      return this.formatSuccess({
        page,
        fieldsReturned: fields?.split(',') ?? ['id', 'slug', 'title', 'page_type'],
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при получении страницы: ${slug}`, error);
    }
  }
}
