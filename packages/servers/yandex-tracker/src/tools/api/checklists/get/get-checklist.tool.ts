/**
 * MCP Tool для получения чеклистов задач из Яндекс.Трекера
 *
 * API Tool (прямой доступ к API):
 * - Batch-режим: получение чеклистов из нескольких задач
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
import type { ChecklistItemWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetChecklistParamsSchema } from '#tools/api/checklists/get/get-checklist.schema.js';

import { GET_CHECKLIST_TOOL_METADATA } from './get-checklist.metadata.js';

/**
 * Инструмент для получения чеклистов задач (batch-режим)
 *
 * Ответственность (SRP):
 * - Координация процесса получения чеклистов из нескольких задач
 * - Делегирование валидации в BaseTool
 * - Делегирование обработки результатов в BatchResultProcessor
 * - Делегирование логирования в ResultLogger
 * - Форматирование итогового результата
 */
export class GetChecklistTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = GET_CHECKLIST_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof GetChecklistParamsSchema {
    return GetChecklistParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, GetChecklistParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueIds, fields, cursor, perPage, fetchAll, maxItems, maxTotalItems } =
      validation.data;

    try {
      // 2. Логирование начала операции
      ResultLogger.logOperationStart(
        this.logger,
        'Получение чеклистов задач',
        issueIds.length,
        fields
      );

      // 3. API v3: получение чеклистов для нескольких задач через batch-метод
      const results = await this.facade.getChecklistMany(issueIds, {
        ...(cursor !== undefined ? { cursor } : {}),
        ...(perPage !== undefined ? { perPage } : {}),
        ...(fetchAll !== undefined ? { fetchAll } : {}),
        ...(maxItems !== undefined ? { maxItems } : {}),
        ...(maxTotalItems !== undefined ? { maxTotalItems } : {}),
      });

      // 4. Обработка результатов через BatchResultProcessor. Отчёт детектора
      // незаполненных полей копится внутри filter по ВСЕМ успешным задачам
      // батча сразу — задача без какого-то поля в единственном элементе
      // не породит шум там, где у других задач это поле есть (план
      // `plan_tool_contract_unification`, 1.1 «граничные случаи», 2.8).
      const filter = paginatedFieldFilter<ChecklistItemWithUnknownFields>(fields);
      const processedResults = BatchResultProcessor.process(results, filter);
      const { fieldsWithoutValue } = filter.getReport();

      // 5. Логирование результатов
      ResultLogger.logBatchResults(
        this.logger,
        'Чеклисты задач получены',
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
            itemsCount: item.data.items.length,
            checklist: item.data.items,
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
        `Ошибка при получении чеклистов задач (${issueIds.length} задач)`,
        error
      );
    }
  }
}
