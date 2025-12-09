/**
 * MCP Tool для удаления связей между задачами в Яндекс.Трекере
 *
 * API Tool (прямой доступ к API):
 * - Batch-режим: удаление связей из нескольких задач
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool, ResultLogger } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { DeleteLinkParamsSchema } from './delete-link.schema.js';

import { DELETE_LINK_TOOL_METADATA } from './delete-link.metadata.js';

/**
 * Инструмент для удаления связей между задачами (batch-режим)
 *
 * Ответственность (SRP):
 * - Координация процесса удаления связей из нескольких задач
 * - Делегирование валидации в BaseTool
 * - Ручная обработка результатов (void не поддерживается BatchResultProcessor)
 * - Делегирование логирования в ResultLogger
 * - Форматирование итогового результата
 */
export class DeleteLinkTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = DELETE_LINK_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof DeleteLinkParamsSchema {
    return DeleteLinkParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, DeleteLinkParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { links } = validation.data;

    try {
      // 2. Логирование начала операции
      ResultLogger.logOperationStart(this.logger, 'Удаление связей', links.length);

      // 3. API v3: удаление связей через batch-метод
      const results = await this.facade.deleteLinksMany(links);

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
        'Связи удалены',
        {
          totalRequested: links.length,
          successCount: processedResults.successful.length,
          failedCount: processedResults.failed.length,
          fieldsCount: 0, // DELETE операция не возвращает поля
        },
        processedResults
      );

      return this.formatSuccess({
        total: links.length,
        successful: processedResults.successful.map((item) => {
          // Разбираем ключ "issueId:linkId"
          const [issueId, linkId] = item.key.split(':');
          return {
            issueId,
            linkId,
            success: true,
          };
        }),
        failed: processedResults.failed.map((item) => {
          // Разбираем ключ "issueId:linkId"
          const [issueId, linkId] = item.key.split(':');
          return {
            issueId,
            linkId,
            error: item.error,
          };
        }),
      });
    } catch (error: unknown) {
      return this.formatError(`Ошибка при удалении связей (${links.length} связей)`, error);
    }
  }
}
