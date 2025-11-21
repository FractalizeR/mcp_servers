/**
 * MCP Tool для массовой смены статусов задач в Яндекс.Трекере
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (bulk transition issues)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 * - Асинхронная операция на сервере
 */

import { BaseTool } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { ResultLogger } from '@mcp-framework/core';
import { BulkTransitionIssuesDefinition } from './bulk-transition-issues.definition.js';
import { BulkTransitionIssuesParamsSchema } from './bulk-transition-issues.schema.js';

import { BULK_TRANSITION_ISSUES_TOOL_METADATA } from './bulk-transition-issues.metadata.js';

/**
 * Инструмент для массовой смены статусов задач
 *
 * Ответственность (SRP):
 * - Координация процесса массового перехода статусов
 * - Делегирование валидации в BaseTool
 * - Делегирование логирования в ResultLogger
 * - Форматирование итогового результата
 *
 * ВАЖНО:
 * - Операция асинхронная (возвращает operationId)
 * - Для проверки статуса используй get_bulk_change_status
 * - Переход должен быть доступен для всех указанных задач
 */
export class BulkTransitionIssuesTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = BULK_TRANSITION_ISSUES_TOOL_METADATA;

  private readonly definition = new BulkTransitionIssuesDefinition();

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof BulkTransitionIssuesParamsSchema {
    return BulkTransitionIssuesParamsSchema;
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
    const validation = this.validateParams(params, BulkTransitionIssuesParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issues, transition, values } = validation.data;

    try {
      // 2. Логирование начала операции
      ResultLogger.logOperationStart(
        this.logger,
        `Массовый переход ${issues.length} задач в статус через "${transition}"`,
        values ? Object.keys(values).length : 0
      );

      this.logger.info(`Переход: ${transition}`);
      this.logger.info(`Задачи: ${issues.join(', ')}`);
      if (values) {
        this.logger.info(`Дополнительные поля: ${Object.keys(values).join(', ')}`);
      }

      // 3. API v2: массовый переход статусов (асинхронная операция)
      const operation = await this.facade.bulkTransitionIssues({
        issues,
        transition,
        ...(values && { values: values as Record<string, unknown> }),
      });

      // 4. Логирование результата
      this.logger.info(
        `Операция массового перехода создана. ID: ${operation.id}, Статус: ${operation.status}`
      );

      // 5. Формирование ответа
      return this.formatSuccess({
        message: `Операция массового перехода запущена для ${issues.length} задач`,
        operationId: operation.id,
        status: operation.status,
        totalIssues: operation.totalIssues ?? issues.length,
        transition,
        additionalFields: values ? Object.keys(values) : [],
        note: 'Операция выполняется асинхронно. Используй get_bulk_change_status для проверки статуса.',
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при массовом переходе ${issues.length} задач в статус через "${transition}"`,
        error as Error
      );
    }
  }
}
