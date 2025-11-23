/**
 * MCP Tool для получения истории изменений задач из Яндекс.Трекера
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = batch API вызов (get issue changelog)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { ResponseFieldFilter, BatchResultProcessor, ResultLogger } from '@mcp-framework/core';
import type { ChangelogEntryWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetIssueChangelogParamsSchema } from '#tools/api/issues/changelog/get-issue-changelog.schema.js';

import { GET_ISSUE_CHANGELOG_TOOL_METADATA } from './get-issue-changelog.metadata.js';

/**
 * Инструмент для получения истории изменений задач (batch-режим)
 *
 * Ответственность (SRP):
 * - Координация процесса получения истории изменений задач из Яндекс.Трекера (batch-режим)
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
export class GetIssueChangelogTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = GET_ISSUE_CHANGELOG_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof GetIssueChangelogParamsSchema {
    return GetIssueChangelogParamsSchema;
  }
  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, GetIssueChangelogParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueKeys, fields } = validation.data;

    try {
      // 2. Логирование начала операции
      ResultLogger.logOperationStart(
        this.logger,
        'Получение истории изменений задач',
        issueKeys.length,
        fields
      );

      // 3. API v3: получение истории изменений через batch-метод
      const results = await this.facade.getIssueChangelog(issueKeys);

      // 4. Обработка результатов через BatchResultProcessor
      const processedResults = BatchResultProcessor.process(
        results,
        (
          changelog: ChangelogEntryWithUnknownFields[]
        ): Partial<ChangelogEntryWithUnknownFields>[] =>
          changelog.map((entry) =>
            ResponseFieldFilter.filter<ChangelogEntryWithUnknownFields>(entry, fields)
          )
      );

      // 5. Логирование результатов
      ResultLogger.logBatchResults(
        this.logger,
        'История изменений получена',
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
        successful: processedResults.successful.map((item) => ({
          issueKey: item.key,
          changelog: item.data,
          totalEntries: Array.isArray(item.data) ? item.data.length : 0,
        })),
        failed: processedResults.failed,
        fieldsReturned: fields,
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при получении истории изменений задач (${issueKeys.length} шт.)`,
        error
      );
    }
  }
}
