/**
 * MCP Tool для обновления элементов чеклистов задач
 *
 * API Tool (прямой доступ к API):
 * - Batch-режим: обновление элементов в нескольких задачах
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
import type { ChecklistItemWithUnknownFields } from '#tracker_api/entities/index.js';
import { UpdateChecklistItemParamsSchema } from '#tools/api/checklists/update/update-checklist-item.schema.js';

import { UPDATE_CHECKLIST_ITEM_TOOL_METADATA } from './update-checklist-item.metadata.js';

/**
 * Инструмент для обновления элементов чеклистов задач (batch-режим)
 *
 * Ответственность (SRP):
 * - Координация процесса обновления элементов в нескольких задачах
 * - Делегирование валидации в BaseTool
 * - Делегирование обработки результатов в BatchResultProcessor
 * - Делегирование логирования в ResultLogger
 * - Форматирование итогового результата
 */
export class UpdateChecklistItemTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = UPDATE_CHECKLIST_ITEM_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof UpdateChecklistItemParamsSchema {
    return UpdateChecklistItemParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, UpdateChecklistItemParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { items, fields } = validation.data;

    try {
      // 2. Логирование начала операции
      ResultLogger.logOperationStart(
        this.logger,
        'Обновление элементов чеклистов',
        items.length,
        fields
      );

      // 3. API v2: обновление элементов через batch-метод
      const results = await this.facade.updateChecklistItemMany(items);

      // 4. Обработка результатов через BatchResultProcessor (без фильтрации —
      // фильтруем ниже одним проходом, чтобы детектор незаполненных полей
      // увидел все элементы батча сразу)
      const processedResults = BatchResultProcessor.process(results);
      const { fieldsWithoutValue } = ResponseFieldFilter.filterWithReport<
        ChecklistItemWithUnknownFields[]
      >(
        processedResults.successful.map((item) => item.data),
        fields
      );
      const warnings = ResponseFieldFilter.toWarnings(fieldsWithoutValue);

      // 5. Логирование результатов
      ResultLogger.logBatchResults(
        this.logger,
        'Элементы чеклистов обновлены',
        {
          totalRequested: items.length,
          successCount: processedResults.successful.length,
          failedCount: processedResults.failed.length,
          fieldsCount: fields.length,
        },
        processedResults
      );

      return this.formatSuccess(
        {
          total: items.length,
          successful: processedResults.successful.map((result) => ({
            issueId: result.key.split('/')[0],
            checklistItemId: result.key.split('/')[1],
            item: ResponseFieldFilter.filter<ChecklistItemWithUnknownFields>(result.data, fields),
          })),
          failed: processedResults.failed.map((result) => ({
            issueId: result.key.split('/')[0],
            checklistItemId: result.key.split('/')[1],
            error: result.error,
          })),
        },
        warnings
      );
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при обновлении элементов чеклистов (${items.length} элементов)`,
        error
      );
    }
  }
}
