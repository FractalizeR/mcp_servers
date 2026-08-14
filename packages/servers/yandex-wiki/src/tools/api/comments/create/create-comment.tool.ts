import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { YandexWikiFacade } from '#wiki_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { CreateCommentParamsSchema } from './create-comment.schema.js';
import { CREATE_COMMENT_TOOL_METADATA } from './create-comment.metadata.js';

export class CreateCommentTool extends BaseTool<YandexWikiFacade> {
  static override readonly METADATA = CREATE_COMMENT_TOOL_METADATA;

  protected override getParamsSchema(): typeof CreateCommentParamsSchema {
    return CreateCommentParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    const validation = this.validateParams(params, CreateCommentParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { idx, body, inline_text, parent_id, thread_id } = validation.data;

    try {
      ResultLogger.logOperationStart(this.logger, 'Создание комментария', 1);

      const comment = await this.facade.createComment(idx, {
        body,
        ...(inline_text !== undefined && { inline_text }),
        ...(parent_id !== undefined && { parent_id }),
        ...(thread_id !== undefined && { thread_id }),
      });

      return this.formatSuccess({ idx, comment });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при создании комментария на странице: ${idx}`, error);
    }
  }
}
