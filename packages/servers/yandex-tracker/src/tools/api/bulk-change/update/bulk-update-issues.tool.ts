/**
 * MCP Tool для массового обновления задач в Яндекс.Трекере
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (bulk update issues)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 * - Асинхронная операция на сервере
 */

import { BaseTool } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { ResultLogger } from '@mcp-framework/core';
import { BulkUpdateIssuesParamsSchema } from './bulk-update-issues.schema.js';

import { BULK_UPDATE_ISSUES_TOOL_METADATA } from './bulk-update-issues.metadata.js';

/**
 * Инструмент для массового обновления задач
 *
 * Ответственность (SRP):
 * - Координация процесса массового обновления задач
 * - Делегирование валидации в BaseTool
 * - Делегирование логирования в ResultLogger
 * - Форматирование итогового результата
 *
 * ВАЖНО:
 * - Операция асинхронная (возвращает operationId)
 * - Для проверки статуса используй get_bulk_change_status
 */
export class BulkUpdateIssuesTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = BULK_UPDATE_ISSUES_TOOL_METADATA;
  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof BulkUpdateIssuesParamsSchema {
    return BulkUpdateIssuesParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, BulkUpdateIssuesParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issues, values } = validation.data;

    try {
      // 2. Логирование начала операции
      ResultLogger.logOperationStart(
        this.logger,
        `Массовое обновление ${issues.length} задач`,
        Object.keys(values).length
      );

      this.logger.info(`Обновляемые поля: ${Object.keys(values).join(', ')}`);
      this.logger.info(`Задачи: ${issues.join(', ')}`);

      // 3. API v2: массовое обновление задач (асинхронная операция)
      const operation = await this.facade.bulkUpdateIssues({
        issues,
        values: values as Record<string, unknown>,
      });

      // 4. Логирование результата
      this.logger.info(
        `Операция массового обновления создана. ID: ${operation.id}, Статус: ${operation.status}`
      );

      // 5. Формирование ответа
      return this.formatSuccess({
        message: `Операция массового обновления запущена для ${issues.length} задач`,
        operationId: operation.id,
        status: operation.status,
        totalIssues: operation.totalIssues ?? issues.length,
        updatedFields: Object.keys(values),
        note: 'Операция выполняется асинхронно. Используй get_bulk_change_status для проверки статуса.',
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при массовом обновлении ${issues.length} задач`,
        error as Error
      );
    }
  }
}
