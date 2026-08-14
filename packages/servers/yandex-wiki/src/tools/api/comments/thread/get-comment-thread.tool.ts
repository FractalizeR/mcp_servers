import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { ResourceLinkDescriptor } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { Comment } from '#wiki_api/entities/index.js';
import { buildPageCommentResourceUri } from '#resources/index.js';
import { GetCommentThreadParamsSchema } from './get-comment-thread.schema.js';
import { GET_COMMENT_THREAD_TOOL_METADATA } from './get-comment-thread.metadata.js';

export class GetCommentThreadTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = GET_COMMENT_THREAD_TOOL_METADATA;

  protected override getParamsSchema(): typeof GetCommentThreadParamsSchema {
    return GetCommentThreadParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, GetCommentThreadParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx, comment_id, cursor, page_size, responseMode } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Получение треда комментария', 1);

      const response = await this.facade.getCommentThread({
        idx,
        comment_id,
        ...(cursor !== undefined && { cursor }),
        ...(page_size !== undefined && { page_size }),
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
      return this.formatError(
        `Ошибка при получении треда комментария ${comment_id} страницы: ${idx}`,
        error
      );
    }
  }
}
