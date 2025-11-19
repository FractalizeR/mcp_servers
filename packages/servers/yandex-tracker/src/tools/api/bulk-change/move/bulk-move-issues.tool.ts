/**
 * MCP Tool для массового перемещения задач между очередями в Яндекс.Трекере
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (bulk move issues)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 * - Асинхронная операция на сервере
 */

import { BaseTool } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { ResultLogger } from '@mcp-framework/core';
import { BulkMoveIssuesDefinition } from './bulk-move-issues.definition.js';
import { BulkMoveIssuesParamsSchema } from './bulk-move-issues.schema.js';

import { BULK_MOVE_ISSUES_TOOL_METADATA } from './bulk-move-issues.metadata.js';

/**
 * Инструмент для массового перемещения задач между очередями
 *
 * Ответственность (SRP):
 * - Координация процесса массового перемещения задач
 * - Делегирование валидации в BaseTool
 * - Делегирование логирования в ResultLogger
 * - Форматирование итогового результата
 *
 * ВАЖНО:
 * - Операция асинхронная (возвращает operationId)
 * - Для проверки статуса используй get_bulk_change_status
 * - Задачи перемещаются в целевую очередь с сохранением или обновлением полей
 */
export class BulkMoveIssuesTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = BULK_MOVE_ISSUES_TOOL_METADATA;

  private readonly definition = new BulkMoveIssuesDefinition();

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, BulkMoveIssuesParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issues, queue, moveAllFields, values } = validation.data;

    try {
      // 2. Логирование начала операции
      ResultLogger.logOperationStart(
        this.logger,
        `Массовое перемещение ${issues.length} задач в очередь "${queue}"`,
        values ? Object.keys(values).length : 0
      );

      this.logger.info(`Целевая очередь: ${queue}`);
      this.logger.info(`Задачи: ${issues.join(', ')}`);
      this.logger.info(`Переместить все поля: ${moveAllFields ?? false}`);
      if (values) {
        this.logger.info(`Дополнительные поля: ${Object.keys(values).join(', ')}`);
      }

      // 3. API v2: массовое перемещение задач (асинхронная операция)
      const operation = await this.facade.bulkMoveIssues({
        issues,
        queue,
        ...(moveAllFields !== undefined && { moveAllFields }),
        ...(values && { values: values as Record<string, unknown> }),
      });

      // 4. Логирование результата
      this.logger.info(
        `Операция массового перемещения создана. ID: ${operation.id}, Статус: ${operation.status}`
      );

      // 5. Формирование ответа
      return this.formatSuccess({
        message: `Операция массового перемещения запущена для ${issues.length} задач`,
        operationId: operation.id,
        status: operation.status,
        totalIssues: operation.totalIssues ?? issues.length,
        targetQueue: queue,
        moveAllFields: moveAllFields ?? false,
        additionalFields: values ? Object.keys(values) : [],
        note: 'Операция выполняется асинхронно. Используй get_bulk_change_status для проверки статуса.',
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при массовом перемещении ${issues.length} задач в очередь "${queue}"`,
        error as Error
      );
    }
  }
}
