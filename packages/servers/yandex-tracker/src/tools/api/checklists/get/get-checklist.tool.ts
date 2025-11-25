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
  ResponseFieldFilter,
  BatchResultProcessor,
  ResultLogger,
} from '@mcp-framework/core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
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

    const { issueIds, fields } = validation.data;

    try {
      // 2. Логирование начала операции
      ResultLogger.logOperationStart(
        this.logger,
        'Получение чеклистов задач',
        issueIds.length,
        fields
      );

      // 3. API v2: получение чеклистов для нескольких задач через batch-метод
      const results = await this.facade.getChecklistMany(issueIds);

      // 4. Обработка результатов через BatchResultProcessor
      const processedResults = BatchResultProcessor.process(
        results,
        (checklist: ChecklistItemWithUnknownFields[]): Partial<ChecklistItemWithUnknownFields>[] =>
          checklist.map((item) =>
            ResponseFieldFilter.filter<ChecklistItemWithUnknownFields>(item, fields)
          )
      );

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

      return this.formatSuccess({
        total: issueIds.length,
        successful: processedResults.successful.map((item) => ({
          issueId: item.key,
          itemsCount: Array.isArray(item.data) ? item.data.length : 0,
          checklist: item.data,
        })),
        failed: processedResults.failed.map((item) => ({
          issueId: item.key,
          error: item.error,
        })),
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при получении чеклистов задач (${issueIds.length} задач)`,
        error
      );
    }
  }
}
