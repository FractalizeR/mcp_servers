/**
 * MCP Tool для редактирования комментария
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (edit comment)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool, ResponseFieldFilter } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import type { CommentWithUnknownFields } from '#tracker_api/entities/index.js';
import { EditCommentParamsSchema } from '#tools/api/comments/edit/edit-comment.schema.js';

import { EDIT_COMMENT_TOOL_METADATA } from './edit-comment.metadata.js';

/**
 * Инструмент для редактирования комментария
 *
 * Ответственность (SRP):
 * - Координация процесса редактирования комментария
 * - Делегирование валидации в BaseTool
 * - Форматирование итогового результата
 */
export class EditCommentTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = EDIT_COMMENT_TOOL_METADATA;
  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof EditCommentParamsSchema {
    return EditCommentParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, EditCommentParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueId, commentId, text, fields } = validation.data;

    try {
      // 2. Логирование начала операции
      this.logger.info('Редактирование комментария', {
        issueId,
        commentId,
        textLength: text.length,
      });

      // 3. API v3: редактирование комментария
      const comment: CommentWithUnknownFields = await this.facade.editComment(issueId, commentId, {
        text,
      });

      // 4. Фильтрация полей ответа
      const filtered = ResponseFieldFilter.filter<CommentWithUnknownFields>(comment, fields);

      // 5. Логирование результата
      this.logger.info('Комментарий успешно обновлён', {
        issueId,
        commentId,
        version: comment.version,
      });

      return this.formatSuccess({
        commentId: filtered.id,
        comment: filtered,
        issueId,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при редактировании комментария ${commentId} задачи ${issueId}`,
        error
      );
    }
  }
}
