/**
 * MCP Tool для добавления комментария к задачам
 *
 * API Tool (прямой доступ к API):
 * - Batch-режим: добавление комментариев к нескольким задачам
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
import { AddCommentParamsSchema } from '#tools/api/comments/add/add-comment.schema.js';

import { ADD_COMMENT_TOOL_METADATA } from './add-comment.metadata.js';

/**
 * Инструмент для добавления комментария к задачам (batch-режим)
 *
 * Ответственность (SRP):
 * - Координация процесса добавления комментариев к нескольким задачам
 * - Делегирование валидации в BaseTool
 * - Делегирование обработки результатов в BatchResultProcessor
 * - Делегирование логирования в ResultLogger
 * - Форматирование итогового результата
 */
export class AddCommentTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = ADD_COMMENT_TOOL_METADATA;
  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof AddCommentParamsSchema {
    return AddCommentParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, AddCommentParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { comments, fields } = validation.data;

    try {
      // 2. Логирование начала операции
      ResultLogger.logOperationStart(
        this.logger,
        'Добавление комментариев',
        comments.length,
        fields
      );

      // 3. API v3: добавление комментариев через batch-метод
      const results = await this.facade.addCommentsMany(comments);

      // 4. Обработка результатов через BatchResultProcessor
      const processedResults = BatchResultProcessor.process(
        results,
        (comment: CommentWithUnknownFields): Partial<CommentWithUnknownFields> =>
          ResponseFieldFilter.filter<CommentWithUnknownFields>(comment, fields)
      );

      // 5. Логирование результатов
      ResultLogger.logBatchResults(
        this.logger,
        'Комментарии добавлены',
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
        successful: processedResults.successful.length,
        failed: processedResults.failed.length,
        comments: processedResults.successful.map((item) => ({
          issueId: item.key,
          commentId: item.data.id,
          comment: item.data,
        })),
        errors: processedResults.failed.map((item) => ({
          issueId: item.key,
          error: item.error,
        })),
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при добавлении комментариев (${comments.length} задач)`,
        error
      );
    }
  }
}
