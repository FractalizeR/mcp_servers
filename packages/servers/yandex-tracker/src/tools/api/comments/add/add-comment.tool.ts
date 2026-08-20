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

    // 'id' нужен всегда: из него строится `commentId` (строковый ключ для
    // последующих edit/delete comment). API возвращает id числом, а схема
    // ответа требует строку — поэтому ниже String(item.data.id).
    const fieldsForFilter = Array.from(new Set([...fields, 'id']));

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

      // 4. Обработка результатов через BatchResultProcessor (без фильтрации —
      // фильтруем ниже одним проходом по всему батчу, чтобы детектор
      // незаполненных полей увидел все элементы сразу)
      const processedResults = BatchResultProcessor.process(results);
      // Отчёт детектора считается по `fields` (запрос агента), не по
      // `fieldsForFilter` (внутренний технический 'id') — иначе 'id' попадал
      // бы в предупреждение, хотя агент его не запрашивал. Считается над
      // СЫРЫМИ данными успешных элементов батча сразу, а не поэлементно —
      // иначе элемент без опционального поля порождал бы шум (см. план
      // `plan_tool_contract_unification`, 1.1 «граничные случаи»).
      const { fieldsWithoutValue } = ResponseFieldFilter.filterWithReport<
        CommentWithUnknownFields[]
      >(
        processedResults.successful.map((item) => item.data),
        fields
      );
      const warnings = ResponseFieldFilter.toWarnings(fieldsWithoutValue);

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

      return this.formatSuccess(
        {
          total: comments.length,
          successful: processedResults.successful.map((item) => ({
            issueId: item.key,
            commentId: String(item.data.id),
            comment: ResponseFieldFilter.filter<CommentWithUnknownFields>(
              item.data,
              fieldsForFilter
            ),
          })),
          failed: processedResults.failed.map((item) => ({
            issueId: item.key,
            error: item.error,
          })),
        },
        warnings
      );
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при добавлении комментариев (${comments.length} задач)`,
        error
      );
    }
  }
}
