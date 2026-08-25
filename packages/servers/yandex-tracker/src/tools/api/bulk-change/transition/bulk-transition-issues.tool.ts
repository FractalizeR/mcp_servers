/**
 * MCP Tool для массовой смены статусов задач в Яндекс.Трекере
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (bulk transition issues)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 * - Асинхронная операция на сервере
 */

import { BaseTool } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { ResultLogger } from '@fractalizer/mcp-core';
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
  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof BulkTransitionIssuesParamsSchema {
    return BulkTransitionIssuesParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, BulkTransitionIssuesParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueIds, transitionId, values } = validation.data;

    try {
      // 2. Логирование начала операции
      ResultLogger.logOperationStart(
        this.logger,
        `Массовый переход ${issueIds.length} задач в статус через "${transitionId}"`,
        values ? Object.keys(values).length : 0
      );

      this.logger.info(`Переход: ${transitionId}`);
      this.logger.info(`Задачи: ${issueIds.join(', ')}`);
      if (values) {
        this.logger.info(`Дополнительные поля: ${Object.keys(values).join(', ')}`);
      }

      // 3. API v3: массовый переход статусов (асинхронная операция)
      const operation = await this.facade.bulkTransitionIssues({
        issues: issueIds,
        transition: transitionId,
        ...(values && { values: values as Record<string, unknown> }),
      });

      // 4. Логирование результата
      this.logger.info(
        `Операция массового перехода создана. ID: ${operation.id}, Статус: ${operation.status}`
      );

      // 5. Формирование ответа
      return this.formatSuccess({
        message: `Операция массового перехода запущена для ${issueIds.length} задач`,
        operationId: operation.id,
        status: operation.status,
        totalIssues: operation.totalIssues ?? issueIds.length,
        transitionId,
        additionalFields: values ? Object.keys(values) : [],
        note: 'Операция выполняется асинхронно. Используй get_bulk_change_status для проверки статуса.',
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при массовом переходе ${issueIds.length} задач в статус через "${transitionId}"`,
        error
      );
    }
  }
}
