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
  BatchResultProcessor,
  ResultLogger,
  ResponseFieldFilter,
} from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { paginatedFieldFilter } from '#common/index.js';
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

    const { issueIds, fields, cursor, perPage, fetchAll, maxItems, maxTotalItems } =
      validation.data;

    try {
      // 2. Логирование начала операции
      ResultLogger.logOperationStart(
        this.logger,
        'Получение записей времени',
        issueIds.length,
        fields
      );

      // 3. API v2: получение записей времени через batch-метод
      const results = await this.facade.getWorklogsMany(issueIds, {
        cursor,
        perPage,
        fetchAll,
        maxItems,
        maxTotalItems,
      });

      // 4. Обработка результатов через BatchResultProcessor. Отчёт детектора
      // незаполненных полей копится внутри filter по ВСЕМ успешным задачам
      // батча сразу — задача без какого-то поля в единственной записи не
      // породит шум там, где у других задач это поле есть (план
      // `plan_tool_contract_unification`, 1.1 «граничные случаи», 2.8).
      const filter = paginatedFieldFilter<WorklogWithUnknownFields>(fields);
      const processedResults = BatchResultProcessor.process(results, filter);
      const { fieldsWithoutValue } = filter.getReport();

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

      return this.formatSuccess(
        {
          total: issueIds.length,
          successful: processedResults.successful.map((item) => ({
            issueId: item.key,
            worklogs: item.data.items,
            count: item.data.items.length,
            pagination: item.data.pagination,
          })),
          failed: processedResults.failed.map((item) => ({
            issueId: item.key,
            error: item.error,
          })),
        },
        ResponseFieldFilter.toWarnings(fieldsWithoutValue)
      );
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при получении записей времени (${issueIds.length} задач)`,
        error
      );
    }
  }
}
