/**
 * MCP Tool для добавления записей времени к задачам
 *
 * API Tool (прямой доступ к API):
 * - Batch-режим: добавление записей времени к нескольким задачам
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 * - Автоматическая конвертация duration в ISO 8601
 */

import {
  BaseTool,
  ResponseFieldFilter,
  BatchResultProcessor,
  ResultLogger,
} from '@mcp-framework/core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import type { WorklogWithUnknownFields } from '#tracker_api/entities/index.js';
import { AddWorklogParamsSchema } from '#tools/api/worklog/add/add-worklog.schema.js';

import { ADD_WORKLOG_TOOL_METADATA } from './add-worklog.metadata.js';

/**
 * Инструмент для добавления записей времени к задачам (batch-режим)
 *
 * Ответственность (SRP):
 * - Координация процесса добавления записей времени к нескольким задачам
 * - Делегирование валидации в BaseTool
 * - Делегирование обработки результатов в BatchResultProcessor
 * - Делегирование логирования в ResultLogger
 * - Форматирование итогового результата
 */
export class AddWorklogTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = ADD_WORKLOG_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof AddWorklogParamsSchema {
    return AddWorklogParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, AddWorklogParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { worklogs, fields } = validation.data;

    try {
      // 2. Логирование начала операции
      ResultLogger.logOperationStart(
        this.logger,
        'Добавление записей времени',
        worklogs.length,
        fields
      );

      // 3. API v2: добавление записей времени через batch-метод
      const results = await this.facade.addWorklogsMany(worklogs);

      // 4. Обработка результатов через BatchResultProcessor
      const processedResults = BatchResultProcessor.process(
        results,
        (worklog: WorklogWithUnknownFields): Partial<WorklogWithUnknownFields> =>
          ResponseFieldFilter.filter<WorklogWithUnknownFields>(worklog, fields)
      );

      // 5. Логирование результатов
      ResultLogger.logBatchResults(
        this.logger,
        'Записи времени добавлены',
        {
          totalRequested: worklogs.length,
          successCount: processedResults.successful.length,
          failedCount: processedResults.failed.length,
          fieldsCount: fields.length,
        },
        processedResults
      );

      return this.formatSuccess({
        total: worklogs.length,
        successful: processedResults.successful.length,
        failed: processedResults.failed.length,
        worklogs: processedResults.successful.map((item) => ({
          issueId: item.key,
          worklogId: item.data.id,
          worklog: item.data,
        })),
        errors: processedResults.failed.map((item) => ({
          issueId: item.key,
          error: item.error,
        })),
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при добавлении записей времени (${worklogs.length} задач)`,
        error
      );
    }
  }
}
