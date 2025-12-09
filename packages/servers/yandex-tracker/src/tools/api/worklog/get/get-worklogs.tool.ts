/**
 * MCP Tool для получения записей времени задач
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = batch API вызов (get worklogs for multiple issues)
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
import type { WorklogWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetWorklogsParamsSchema } from '#tools/api/worklog/get/get-worklogs.schema.js';

import { GET_WORKLOGS_TOOL_METADATA } from './get-worklogs.metadata.js';

/**
 * Инструмент для получения записей времени задач (batch-режим)
 *
 * Ответственность (SRP):
 * - Координация процесса получения записей времени для нескольких задач
 * - Делегирование валидации в BaseTool
 * - Делегирование обработки результатов в BatchResultProcessor
 * - Делегирование логирования в ResultLogger
 * - Форматирование итогового результата
 */
export class GetWorklogsTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = GET_WORKLOGS_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof GetWorklogsParamsSchema {
    return GetWorklogsParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, GetWorklogsParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueIds, fields } = validation.data;

    try {
      // 2. Логирование начала операции
      ResultLogger.logOperationStart(
        this.logger,
        'Получение записей времени',
        issueIds.length,
        fields
      );

      // 3. API v2: получение записей времени через batch-метод
      const results = await this.facade.getWorklogsMany(issueIds);

      // 4. Обработка результатов через BatchResultProcessor
      const processedResults = BatchResultProcessor.process(
        results,
        (worklogs: WorklogWithUnknownFields[]): Partial<WorklogWithUnknownFields>[] =>
          worklogs.map((worklog) =>
            ResponseFieldFilter.filter<WorklogWithUnknownFields>(worklog, fields)
          )
      );

      // 5. Логирование результатов
      ResultLogger.logBatchResults(
        this.logger,
        'Записи времени получены',
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
        worklogs: processedResults.successful.map((item) => ({
          issueId: item.key,
          worklogs: item.data,
          count: item.data.length,
        })),
        errors: processedResults.failed.map((item) => ({
          issueId: item.key,
          error: item.error,
        })),
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при получении записей времени (${issueIds.length} задач)`,
        error
      );
    }
  }
}
