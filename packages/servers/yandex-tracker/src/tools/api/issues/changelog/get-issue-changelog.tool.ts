/**
 * MCP Tool для получения истории изменений задач из Яндекс.Трекера
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = batch API вызов (get issue changelog)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool } from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { BatchResultProcessor, ResponseFieldFilter, ResultLogger } from '@fractalizer/mcp-core';
import type { ProcessedBatchResult } from '@fractalizer/mcp-core';
import { paginatedFieldFilter } from '#common/index.js';
import type { ChangelogEntryWithUnknownFields } from '#tracker_api/entities/index.js';
import type { FilteredPaginatedResult } from '#common/index.js';
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

  /** Строит `{ total, successful[], failed[] }` из обработанного batch-результата. */
  private buildResponseData(
    total: number,
    processedResults: ProcessedBatchResult<
      string,
      FilteredPaginatedResult<ChangelogEntryWithUnknownFields>
    >
  ): {
    total: number;
    successful: Array<{
      issueId: string;
      changelog: ChangelogEntryWithUnknownFields[];
      totalEntries: number;
      pagination: FilteredPaginatedResult<ChangelogEntryWithUnknownFields>['pagination'];
    }>;
    failed: Array<{ issueId: string; error: unknown }>;
  } {
    return {
      total,
      successful: processedResults.successful.map((item) => ({
        issueId: item.key,
        changelog: item.data.items,
        totalEntries: item.data.items.length,
        pagination: item.data.pagination,
      })),
      failed: processedResults.failed.map((item) => ({
        issueId: item.key,
        error: item.error,
      })),
    };
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, GetIssueChangelogParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueIds, fields, cursor, perPage, fetchAll, maxItems, maxTotalItems } =
      validation.data;

    try {
      // 2. Логирование начала операции
      ResultLogger.logOperationStart(
        this.logger,
        'Получение истории изменений задач',
        issueIds.length,
        fields
      );

      // 3. API v3: получение истории изменений через batch-метод (с пагинацией)
      const results = await this.facade.getIssueChangelog(issueIds, {
        ...(cursor !== undefined && { cursor }),
        ...(perPage !== undefined && { perPage }),
        ...(fetchAll !== undefined && { fetchAll }),
        ...(maxItems !== undefined && { maxItems }),
        ...(maxTotalItems !== undefined && { maxTotalItems }),
      });

      // 4. Обработка результатов через BatchResultProcessor.
      //    paginatedFieldFilter фильтрует items, прокидывает pagination без
      //    изменений и копит отчёт детектора незаполненных полей по ВСЕМ
      //    успешным задачам батча сразу (план `plan_tool_contract_unification`, 2.8).
      const filter = paginatedFieldFilter<ChangelogEntryWithUnknownFields>(fields);
      const processedResults = BatchResultProcessor.process(results, filter);
      const { fieldsWithoutValue } = filter.getReport();

      // 6. Логирование результатов
      ResultLogger.logBatchResults(
        this.logger,
        'История изменений получена',
        {
          totalRequested: issueIds.length,
          successCount: processedResults.successful.length,
          failedCount: processedResults.failed.length,
          fieldsCount: fields.length,
        },
        processedResults
      );

      return this.formatSuccess(
        this.buildResponseData(issueIds.length, processedResults),
        ResponseFieldFilter.toWarnings(fieldsWithoutValue)
      );
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при получении истории изменений задач (${issueIds.length} шт.)`,
        error
      );
    }
  }
}
