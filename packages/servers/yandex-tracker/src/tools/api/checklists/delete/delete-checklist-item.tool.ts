/**
 * MCP Tool для удаления элементов из чеклистов задач
 *
 * API Tool (прямой доступ к API):
 * - Batch-режим: удаление элементов из чеклистов нескольких задач
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool, ResultLogger } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { DeleteChecklistItemParamsSchema } from '#tools/api/checklists/delete/delete-checklist-item.schema.js';

import { DELETE_CHECKLIST_ITEM_TOOL_METADATA } from './delete-checklist-item.metadata.js';

/**
 * Инструмент для удаления элементов из чеклистов задач (batch-режим)
 *
 * Ответственность (SRP):
 * - Координация процесса удаления элементов из нескольких задач
 * - Делегирование валидации в BaseTool
 * - Ручная обработка результатов (void не поддерживается BatchResultProcessor)
 * - Делегирование логирования в ResultLogger
 * - Форматирование итогового результата
 */
export class DeleteChecklistItemTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = DELETE_CHECKLIST_ITEM_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof DeleteChecklistItemParamsSchema {
    return DeleteChecklistItemParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, DeleteChecklistItemParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { items } = validation.data;

    try {
      // 2. Логирование начала операции
      ResultLogger.logOperationStart(this.logger, 'Удаление элементов из чеклистов', items.length);

      // 3. API v2: удаление элементов через batch-метод
      const results = await this.facade.deleteChecklistItemMany(items);

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
        'Элементы удалены из чеклистов',
        {
          totalRequested: items.length,
          successCount: processedResults.successful.length,
          failedCount: processedResults.failed.length,
          fieldsCount: 0, // DELETE операция не возвращает поля
        },
        processedResults
      );

      return this.formatSuccess({
        total: items.length,
        successful: processedResults.successful.length,
        failed: processedResults.failed.length,
        items: processedResults.successful.map((item) => {
          // Разбираем ключ "issueId/itemId"
          const [issueId, itemId] = item.key.split('/');
          return {
            issueId,
            itemId,
            success: true,
          };
        }),
        errors: processedResults.failed.map((item) => {
          // Разбираем ключ "issueId/itemId"
          const [issueId, itemId] = item.key.split('/');
          return {
            issueId,
            itemId,
            error: item.error,
          };
        }),
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при удалении элементов из чеклистов (${items.length} элементов)`,
        error
      );
    }
  }
}
