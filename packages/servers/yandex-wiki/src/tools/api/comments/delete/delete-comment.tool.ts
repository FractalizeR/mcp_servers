import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { DeleteCommentParamsSchema } from './delete-comment.schema.js';
import { DELETE_COMMENT_TOOL_METADATA } from './delete-comment.metadata.js';

export class DeleteCommentTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = DELETE_COMMENT_TOOL_METADATA;

  protected override getParamsSchema(): typeof DeleteCommentParamsSchema {
    return DeleteCommentParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, DeleteCommentParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx, comment_id } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Удаление комментария', 1);

      const result = await this.facade.deleteComment(idx, comment_id);

      return this.formatSuccess({
        idx,
        comment_id,
        comments_count: result.comments_count,
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при удалении комментария ${comment_id} на странице: ${idx}`,
        error
      );
    }
  }
}
