import { BaseTool, ResultLogger } from '@mcp-framework/core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { GetPageByIdParamsSchema } from './get-page-by-id.schema.js';
import { GET_PAGE_BY_ID_TOOL_METADATA } from './get-page-by-id.metadata.js';

export class GetPageByIdTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = GET_PAGE_BY_ID_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetPageByIdParamsSchema {
    return GetPageByIdParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetPageByIdParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx, fields, raise_on_redirect, revision_id } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Получение страницы по ID', 1);

      const page = await this.facade.getPageById({
        idx,
        ...(fields !== undefined && { fields }),
        ...(raise_on_redirect !== undefined && { raise_on_redirect }),
        ...(revision_id !== undefined && { revision_id }),
      });

      return this.formatSuccess({
        page,
        fieldsReturned: fields?.split(',') ?? ['id', 'slug', 'title', 'page_type'],
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при получении страницы по ID: ${idx}`, error);
    }
  }
}
