import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { ResourceLinkDescriptor } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { Comment } from '#wiki_api/entities/index.js';
import { buildPageCommentResourceUri } from '#resources/index.js';
import { GetCommentsParamsSchema } from './get-comments.schema.js';
import { GET_COMMENTS_TOOL_METADATA } from './get-comments.metadata.js';

export class GetCommentsTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = GET_COMMENTS_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetCommentsParamsSchema {
    return GetCommentsParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetCommentsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx, cursor, order_direction, page_size, status_filter, responseMode } =
      validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Получение комментариев страницы', 1);

      const response = await this.facade.getComments({
        idx,
        ...(cursor !== undefined && { cursor }),
        ...(order_direction !== undefined && { order_direction }),
        ...(page_size !== undefined && { page_size }),
        ...(status_filter !== undefined && { status_filter }),
      });

      const results = Array.isArray(response.results) ? response.results : [];

      const toResourceLink = (item: Comment): ResourceLinkDescriptor => ({
        uri: buildPageCommentResourceUri(idx, item.id),
        name: `comment-${item.id}`,
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
      return this.formatError(`Ошибка при получении комментариев страницы: ${idx}`, error);
    }
  }
}
