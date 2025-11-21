/**
 * MCP Tool для получения статуса bulk операции в Яндекс.Трекере
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (get bulk change status)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { GetBulkChangeStatusDefinition } from './get-bulk-change-status.definition.js';
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

  private readonly definition = new GetBulkChangeStatusDefinition();

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof GetBulkChangeStatusParamsSchema {
    return GetBulkChangeStatusParamsSchema;
  }

  /**
   * @deprecated Используется автогенерация через getParamsSchema()
   */
  protected buildDefinition(): ToolDefinition {
    // Fallback для обратной совместимости (не используется если getParamsSchema() определен)
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, GetBulkChangeStatusParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { operationId } = validation.data;

    try {
      // 2. Логирование начала операции
      this.logger.info(`Получение статуса bulk операции: ${operationId}`);

      // 3. API v2: получение статуса bulk операции
      const operation = await this.facade.getBulkChangeStatus(operationId);

      // 4. Логирование результата
      this.logger.info(
        `Статус операции ${operationId}: ${operation.status}. Прогресс: ${operation.progress ?? 0}%`
      );

      // 5. Формирование ответа
      const response: Record<string, unknown> = {
        operationId: operation.id,
        status: operation.status,
        type: operation.type,
        progress: operation.progress ?? 0,
        totalIssues: operation.totalIssues,
        processedIssues: operation.processedIssues,
        failedIssues: operation.failedIssues,
      };

      // Добавить временные метки если есть
      if (operation.createdAt) response['createdAt'] = operation.createdAt;
      if (operation.startedAt) response['startedAt'] = operation.startedAt;
      if (operation.completedAt) response['completedAt'] = operation.completedAt;

      // Добавить ошибки если есть
      if (operation.errors && operation.errors.length > 0) {
        response['errors'] = operation.errors;
        response['errorsCount'] = operation.errors.length;
      }

      // Добавить параметры операции если есть
      if (operation.parameters) {
        response['parameters'] = operation.parameters;
      }

      // Добавить статусное сообщение
      response['message'] = this.buildStatusMessage(operation.status, operation.progress ?? 0);

      return this.formatSuccess(response);
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при получении статуса bulk операции ${operationId}`,
        error as Error
      );
    }
  }

  /**
   * Построить статусное сообщение
   */
  private buildStatusMessage(status: string, progress: number): string {
    switch (status) {
      case 'PENDING':
        return 'Операция в очереди на выполнение';
      case 'RUNNING':
        return `Операция выполняется. Прогресс: ${progress}%`;
      case 'COMPLETED':
        return 'Операция успешно завершена';
      case 'FAILED':
        return 'Операция завершена с ошибкой. Проверьте поле errors для деталей';
      case 'CANCELLED':
        return 'Операция отменена';
      default:
        return `Неизвестный статус: ${status}`;
    }
  }
}
