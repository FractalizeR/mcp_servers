import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { ResourceLinkDescriptor } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { PageDescendant } from '#wiki_api/entities/index.js';
import { GetDescendantsByIdParamsSchema } from './get-descendants-by-id.schema.js';
import { GET_DESCENDANTS_BY_ID_TOOL_METADATA } from './get-descendants-by-id.metadata.js';

export class GetDescendantsByIdTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = GET_DESCENDANTS_BY_ID_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetDescendantsByIdParamsSchema {
    return GetDescendantsByIdParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetDescendantsByIdParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx, actuality, cursor, include_self, page_size, show_all, responseMode } =
      validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Обход поддерева раздела по ID', 1);

      const response = await this.facade.getDescendantsById({
        idx,
        ...(actuality !== undefined && { actuality }),
        ...(cursor !== undefined && { cursor }),
        ...(include_self !== undefined && { include_self }),
        ...(page_size !== undefined && { page_size }),
        ...(show_all !== undefined && { show_all }),
      });

      const results = Array.isArray(response.results) ? response.results : [];

      const toResourceLink = (item: PageDescendant): ResourceLinkDescriptor => ({
        uri: `wiki://page/${item.slug}`,
        name: item.slug,
      });

      return this.formatCollectionResult({
        items: results,
        mode: responseMode,
        toResourceLink,
        summary: {
          ...(response.next_cursor !== undefined && { next_cursor: response.next_cursor }),
          ...(response.prev_cursor !== undefined && { prev_cursor: response.prev_cursor }),
        },
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при обходе поддерева раздела по ID: ${idx}`, error);
    }
  }
}
