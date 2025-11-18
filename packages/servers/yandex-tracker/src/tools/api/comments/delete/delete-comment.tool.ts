/**
 * MCP Tool для удаления комментария
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (delete comment)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool, ToolCategory, ToolPriority } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { DeleteCommentDefinition } from '@tools/api/comments/delete/delete-comment.definition.js';
import { DeleteCommentParamsSchema } from '@tools/api/comments/delete/delete-comment.schema.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '../../../../constants.js';

/**
 * Инструмент для удаления комментария
 *
 * Ответственность (SRP):
 * - Координация процесса удаления комментария
 * - Делегирование валидации в BaseTool
 * - Форматирование итогового результата
 */
export class DeleteCommentTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = {
    name: buildToolName('delete_comment', MCP_TOOL_PREFIX),
    description: '[Comments/Write] Удалить комментарий',
    category: ToolCategory.COMMENTS,
    subcategory: 'write',
    priority: ToolPriority.HIGH,
    tags: ['comment', 'delete', 'remove', 'write'],
    isHelper: false,
    requiresExplicitUserConsent: true,
  } as const;

  private readonly definition = new DeleteCommentDefinition();

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, DeleteCommentParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueId, commentId } = validation.data;

    try {
      // 2. Логирование начала операции
      this.logger.info('Удаление комментария', {
        issueId,
        commentId,
      });

      // 3. API v3: удаление комментария
      await this.facade.deleteComment(issueId, commentId);

      // 4. Логирование результата
      this.logger.info('Комментарий успешно удалён', {
        issueId,
        commentId,
      });

      return this.formatSuccess({
        success: true,
        commentId,
        issueId,
        message: `Comment ${commentId} deleted from issue ${issueId}`,
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при удалении комментария ${commentId} задачи ${issueId}`,
        error as Error
      );
    }
  }
}
