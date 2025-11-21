/**
 * MCP Tool для получения задач из Яндекс.Трекера
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (batch get issues)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { ResponseFieldFilter, BatchResultProcessor, ResultLogger } from '@mcp-framework/core';
import type { IssueWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetIssuesParamsSchema } from '#tools/api/issues/get/get-issues.schema.js';

import { GET_ISSUES_TOOL_METADATA } from './get-issues.metadata.js';
/**
 * Инструмент для получения информации о задачах
 *
 * Ответственность (SRP):
 * - Координация процесса получения задач из Яндекс.Трекера (batch-режим)
 * - Делегирование валидации в BaseTool
 * - Делегирование обработки результатов в BatchResultProcessor
 * - Делегирование логирования в ResultLogger
 * - Форматирование итогового результата
 *
 * Переиспользуемые компоненты:
 * - BaseTool.validateParams() - валидация через Zod
 * - BatchResultProcessor.process() - обработка batch-результатов
 * - ResultLogger - стандартизированное логирование
 */
export class GetIssuesTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = GET_ISSUES_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof GetIssuesParamsSchema {
    return GetIssuesParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, GetIssuesParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueKeys, fields } = validation.data;

    try {
      // 2. Логирование начала операции
      ResultLogger.logOperationStart(this.logger, 'Получение задач', issueKeys.length, fields);

      // 3. API v3: получение задач через batch-метод
      const results = await this.facade.getIssues(issueKeys);

      // 4. Обработка результатов через BatchResultProcessor
      const processedResults = BatchResultProcessor.process(
        results,
        (issue: IssueWithUnknownFields): Partial<IssueWithUnknownFields> =>
          ResponseFieldFilter.filter<IssueWithUnknownFields>(issue, fields)
      );

      // 5. Логирование результатов
      ResultLogger.logBatchResults(
        this.logger,
        'Задачи получены',
        {
          totalRequested: issueKeys.length,
          successCount: processedResults.successful.length,
          failedCount: processedResults.failed.length,
          fieldsCount: fields.length,
        },
        processedResults
      );

      return this.formatSuccess({
        total: issueKeys.length,
        successful: processedResults.successful.length,
        failed: processedResults.failed.length,
        issues: processedResults.successful.map((item) => ({
          issueKey: item.key, // ← ОБНОВЛЕНО: unified формат (key вместо issueKey)
          issue: item.data,
        })),
        errors: processedResults.failed,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при получении задач (${issueKeys.length} шт.)`,
        error as Error
      );
    }
  }
}
