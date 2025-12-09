/**
 * MCP Tool для удаления комментариев
 *
 * API Tool (прямой доступ к API):
 * - Batch-режим: удаление комментариев из нескольких задач
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { DeleteCommentParamsSchema } from '#tools/api/comments/delete/delete-comment.schema.js';

import { DELETE_COMMENT_TOOL_METADATA } from './delete-comment.metadata.js';

/**
 * Инструмент для удаления комментариев (batch-режим)
 *
 * Ответственность (SRP):
 * - Координация процесса удаления комментариев из нескольких задач
 * - Делегирование валидации в BaseTool
 * - Ручная обработка результатов (void не поддерживается BatchResultProcessor)
 * - Делегирование логирования в ResultLogger
 * - Форматирование итогового результата
 */
export class DeleteCommentTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = DELETE_COMMENT_TOOL_METADATA;
  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof DeleteCommentParamsSchema {
    return DeleteCommentParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, DeleteCommentParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { comments } = validation.data;

    try {
      // 2. Логирование начала операции
      ResultLogger.logOperationStart(this.logger, 'Удаление комментариев', comments.length);

      // 3. API v3: удаление комментариев через batch-метод
      const results = await this.facade.deleteCommentsMany(comments);

      // 4. Ручная обработка результатов (для void результатов)
      // BatchResultProcessor не подходит для void, так как проверяет !result.value
      const successful: Array<{ key: string; data: Record<string, never> }> = [];
      const failed: Array<{ key: string; error: string }> = [];

      for (const result of results) {
        if (result.status === 'fulfilled') {
          successful.push({ key: result.key, data: {} });
        } else {
          const error =
            result.reason instanceof Error ? result.reason.message : String(result.reason);
          failed.push({ key: result.key, error });
        }
      }

      const processedResults = { successful, failed };

      // 5. Логирование результатов
      ResultLogger.logBatchResults(
        this.logger,
        'Комментарии удалены',
        {
          totalRequested: comments.length,
          successCount: processedResults.successful.length,
          failedCount: processedResults.failed.length,
          fieldsCount: 0, // DELETE операция не возвращает поля
        },
        processedResults
      );

      return this.formatSuccess({
        total: comments.length,
        successful: processedResults.successful.map((item) => {
          // Разбираем ключ "issueId:commentId"
          const [issueId, commentId] = item.key.split(':');
          return {
            issueId,
            commentId,
            success: true,
          };
        }),
        failed: processedResults.failed.map((item) => {
          // Разбираем ключ "issueId:commentId"
          const [issueId, commentId] = item.key.split(':');
          return {
            issueId,
            commentId,
            error: item.error,
          };
        }),
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при удалении комментариев (${comments.length} комментариев)`,
        error
      );
    }
  }
}
