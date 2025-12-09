/**
 * MCP Tool для добавления элементов в чеклисты задач
 *
 * API Tool (прямой доступ к API):
 * - Batch-режим: добавление элементов в нескольких задачах
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
import { AddChecklistItemParamsSchema } from '#tools/api/checklists/add/add-checklist-item.schema.js';

import { ADD_CHECKLIST_ITEM_TOOL_METADATA } from './add-checklist-item.metadata.js';

/**
 * Инструмент для добавления элементов в чеклисты задач (batch-режим)
 *
 * Ответственность (SRP):
 * - Координация процесса добавления элементов в несколько задач
 * - Делегирование валидации в BaseTool
 * - Делегирование обработки результатов в BatchResultProcessor
 * - Делегирование логирования в ResultLogger
 * - Форматирование итогового результата
 */
export class AddChecklistItemTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = ADD_CHECKLIST_ITEM_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof AddChecklistItemParamsSchema {
    return AddChecklistItemParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, AddChecklistItemParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { items, fields } = validation.data;

    try {
      // 2. Логирование начала операции
      ResultLogger.logOperationStart(
        this.logger,
        'Добавление элементов в чеклисты',
        items.length,
        fields
      );

      // 3. API v2: добавление элементов через batch-метод
      const results = await this.facade.addChecklistItemMany(items);

      // 4. Обработка результатов через BatchResultProcessor
      const processedResults = BatchResultProcessor.process(
        results,
        (item: ChecklistItemWithUnknownFields): Partial<ChecklistItemWithUnknownFields> =>
          ResponseFieldFilter.filter<ChecklistItemWithUnknownFields>(item, fields)
      );

      // 5. Логирование результатов
      ResultLogger.logBatchResults(
        this.logger,
        'Элементы добавлены в чеклисты',
        {
          totalRequested: items.length,
          successCount: processedResults.successful.length,
          failedCount: processedResults.failed.length,
          fieldsCount: fields.length,
        },
        processedResults
      );

      return this.formatSuccess({
        total: items.length,
        successful: processedResults.successful.length,
        failed: processedResults.failed.length,
        items: processedResults.successful.map((result) => ({
          issueId: result.key,
          itemId: result.data.id,
          item: result.data,
        })),
        errors: processedResults.failed.map((result) => ({
          issueId: result.key,
          error: result.error,
        })),
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при добавлении элементов в чеклисты (${items.length} задач)`,
        error
      );
    }
  }
}
