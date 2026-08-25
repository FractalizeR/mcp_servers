/**
 * MCP Tool для получения статуса bulk операции в Яндекс.Трекере
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (get bulk change status)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool, ResponseFieldFilter } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { BulkChangeStatus } from '#tracker_api/entities/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { GetBulkChangeStatusParamsSchema } from './get-bulk-change-status.schema.js';

import { GET_BULK_CHANGE_STATUS_TOOL_METADATA } from './get-bulk-change-status.metadata.js';

/**
 * Инструмент для получения статуса bulk операции
 *
 * Ответственность (SRP):
 * - Получение статуса асинхронной bulk операции
 * - Делегирование валидации в BaseTool
 * - Форматирование итогового результата
 *
 * Используется для мониторинга прогресса операций:
 * - bulk_update_issues
 * - bulk_transition_issues
 * - bulk_move_issues
 */
export class GetBulkChangeStatusTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = GET_BULK_CHANGE_STATUS_TOOL_METADATA;
  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof GetBulkChangeStatusParamsSchema {
    return GetBulkChangeStatusParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, GetBulkChangeStatusParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { operationId, fields } = validation.data;

    try {
      // 2. Логирование начала операции
      this.logger.info(`Получение статуса bulk операции: ${operationId}`);

      // 3. API v3: получение статуса bulk операции
      const operation = await this.facade.getBulkChangeStatus(operationId);

      // 4. Логирование результата
      this.logger.info(
        `Статус операции ${operationId}: ${operation.status}. ` +
          `Обработано задач: ${operation.executionIssuePercent ?? 0}%`
      );

      // 5. Фильтрация поддерева operation по fields (находка 6 живого прогона
      // 2026-08-20: без этого createdBy безусловно тащил cloudUid/passportUid).
      // operationId/message — вычисляемые/эхо, фильтрации не подлежат.
      const { result: filteredOperation, fieldsWithoutValue } =
        ResponseFieldFilter.filterWithReport(operation, fields);

      const response = {
        operationId: operation.id,
        message: this.buildStatusMessage(operation.status, operation.statusText),
        operation: filteredOperation,
      };

      return this.formatSuccess(response, ResponseFieldFilter.toWarnings(fieldsWithoutValue));
    } catch (error: unknown) {
      return this.formatError(`Ошибка при получении статуса bulk операции ${operationId}`, error);
    }
  }

  /**
   * Построить статусное сообщение
   *
   * Ветка `default` — штатный исход, а не ошибка: перечень статусов bulkchange
   * официально не опубликован, подтверждены только три (см. `BulkChangeStatus`).
   * Для нераспознанного статуса ориентир — `statusText` из ответа API.
   */
  private buildStatusMessage(status: BulkChangeStatus, statusText?: string): string {
    const details = statusText === undefined ? '' : `. Детали: ${statusText}`;

    switch (status) {
      case 'CREATED':
        return `Операция создана и ожидает выполнения${details}`;
      case 'COMPLETE':
        return `Операция успешно завершена${details}`;
      case 'FAILED':
        return `Операция завершена с ошибкой${details}`;
      default:
        return `Статус "${status}" не описан в документации API${details}`;
    }
  }
}
