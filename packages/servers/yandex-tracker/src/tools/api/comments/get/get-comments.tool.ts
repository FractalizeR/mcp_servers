/**
 * MCP Tool для получения комментариев задач
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = batch API вызов (get comments for multiple issues)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool, BatchResultProcessor, ResultLogger } from '@fractalizer/mcp-core';
import { paginatedFieldFilter } from '#tracker_api/utils/index.js';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import type { CommentWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetCommentsParamsSchema } from '#tools/api/comments/get/get-comments.schema.js';

import { GET_COMMENTS_TOOL_METADATA } from './get-comments.metadata.js';

/**
 * Инструмент для получения комментариев задач (batch-режим)
 *
 * Ответственность (SRP):
 * - Координация процесса получения комментариев для нескольких задач
 * - Делегирование валидации в BaseTool
 * - Делегирование обработки результатов в BatchResultProcessor
 * - Делегирование логирования в ResultLogger
 * - Форматирование итогового результата
 */
export class GetCommentsTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = GET_COMMENTS_TOOL_METADATA;
  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof GetCommentsParamsSchema {
    return GetCommentsParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, GetCommentsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueIds, perPage, cursor, fetchAll, maxItems, maxTotalItems, expand, fields } =
      validation.data;

    try {
      // 2. Логирование начала операции
      ResultLogger.logOperationStart(
        this.logger,
        'Получение комментариев',
        issueIds.length,
        fields
      );

      // 3. API v3: получение комментариев через batch-метод
      const results = await this.facade.getCommentsMany(issueIds, {
        perPage,
        cursor,
        fetchAll,
        maxItems,
        maxTotalItems,
        expand: expand?.join(','),
      });

      // 4. Обработка результатов через BatchResultProcessor
      // paginatedFieldFilter фильтрует items и прокидывает pagination без изменений
      const processedResults = BatchResultProcessor.process(
        results,
        paginatedFieldFilter<CommentWithUnknownFields>(fields)
      );

      // 5. Логирование результатов
      ResultLogger.logBatchResults(
        this.logger,
        'Комментарии получены',
        {
          totalRequested: issueIds.length,
          successCount: processedResults.successful.length,
          failedCount: processedResults.failed.length,
          fieldsCount: fields.length,
        },
        processedResults
      );

      return this.formatSuccess({
        total: issueIds.length,
        successful: processedResults.successful.length,
        failed: processedResults.failed.length,
        comments: processedResults.successful.map((item) => ({
          issueId: item.key,
          comments: item.data.items,
          count: item.data.items.length,
          pagination: item.data.pagination,
        })),
        errors: processedResults.failed.map((item) => ({
          issueId: item.key,
          error: item.error,
        })),
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при получении комментариев (${issueIds.length} задач)`,
        error
      );
    }
  }
}
