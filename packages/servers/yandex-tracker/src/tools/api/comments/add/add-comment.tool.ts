/**
 * MCP Tool для добавления комментария к задаче
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (add comment)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import type { CommentWithUnknownFields } from '@tracker_api/entities/index.js';
import { AddCommentDefinition } from '@tools/api/comments/add/add-comment.definition.js';
import { AddCommentParamsSchema } from '@tools/api/comments/add/add-comment.schema.js';

import { ADD_COMMENT_TOOL_METADATA } from './add-comment.metadata.js';

/**
 * Инструмент для добавления комментария к задаче
 *
 * Ответственность (SRP):
 * - Координация процесса добавления комментария
 * - Делегирование валидации в BaseTool
 * - Форматирование итогового результата
 */
export class AddCommentTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = ADD_COMMENT_TOOL_METADATA;

  private readonly definition = new AddCommentDefinition();

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, AddCommentParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueId, text, attachmentIds } = validation.data;

    try {
      // 2. Логирование начала операции
      this.logger.info('Добавление комментария к задаче', {
        issueId,
        textLength: text.length,
        hasAttachments: Boolean(attachmentIds?.length),
      });

      // 3. API v3: добавление комментария
      const comment: CommentWithUnknownFields = await this.facade.addComment(issueId, {
        text,
        attachmentIds,
      });

      // 4. Логирование результата
      this.logger.info('Комментарий успешно добавлен', {
        issueId,
        commentId: comment.id,
        hasAttachments: Boolean(comment.attachments?.length),
      });

      return this.formatSuccess({
        commentId: comment.id,
        comment,
        issueId,
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при добавлении комментария к задаче ${issueId}`,
        error as Error
      );
    }
  }
}
