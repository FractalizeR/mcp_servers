/**
 * MCP Tool для редактирования комментариев
 *
 * API Tool (прямой доступ к API):
 * - Batch-режим: редактирование комментариев из нескольких задач
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import {
  BaseTool,
  ResponseFieldFilter,
  BatchResultProcessor,
  ResultLogger,
} from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { CommentWithUnknownFields } from '#tracker_api/entities/index.js';
import { EditCommentParamsSchema } from '#tools/api/comments/edit/edit-comment.schema.js';

import { EDIT_COMMENT_TOOL_METADATA } from './edit-comment.metadata.js';

/**
 * Инструмент для редактирования комментариев (batch-режим)
 *
 * Ответственность (SRP):
 * - Координация процесса редактирования комментариев из нескольких задач
 * - Делегирование валидации в BaseTool
 * - Делегирование обработки результатов в BatchResultProcessor
 * - Делегирование логирования в ResultLogger
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

    const { comments, fields } = validation.data;

    try {
      // 2. Логирование начала операции
      ResultLogger.logOperationStart(
        this.logger,
        'Редактирование комментариев',
        comments.length,
        fields
      );

      // 3. API v3: редактирование комментариев через batch-метод
      const results = await this.facade.editCommentsMany(comments);

      // 4. Обработка результатов через BatchResultProcessor
      const processedResults = BatchResultProcessor.process(
        results,
        (comment: CommentWithUnknownFields): Partial<CommentWithUnknownFields> =>
          ResponseFieldFilter.filter<CommentWithUnknownFields>(comment, fields)
      );

      // 5. Логирование результатов
      ResultLogger.logBatchResults(
        this.logger,
        'Комментарии отредактированы',
        {
          totalRequested: comments.length,
          successCount: processedResults.successful.length,
          failedCount: processedResults.failed.length,
          fieldsCount: fields.length,
        },
        processedResults
      );

      return this.formatSuccess({
        total: comments.length,
        successful: processedResults.successful.map((item) => {
          // Разбираем ключ "issueId:commentId"
          const [issueId, commentId] = String(item.key).split(':');
          return {
            issueId,
            commentId,
            comment: item.data,
          };
        }),
        failed: processedResults.failed.map((item) => {
          // Разбираем ключ "issueId:commentId"
          const [issueId, commentId] = String(item.key).split(':');
          return {
            issueId,
            commentId,
            error: item.error,
          };
        }),
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при редактировании комментариев (${comments.length} комментариев)`,
        error
      );
    }
  }
}
