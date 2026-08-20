/**
 * MCP Tool для получения связей задач из Яндекс.Трекера
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (batch get issue links)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import {
  BaseTool,
  BatchResultProcessor,
  ResponseFieldFilter,
  ResultLogger,
} from '@fractalizer/mcp-core';
import type { YandexTrackerFacade } from '#tracker_api/facade/index.js';
import type { ToolCallParams, ToolResult } from '@fractalizer/mcp-infrastructure';
import { paginatedFieldFilter } from '#common/index.js';
import type { LinkWithUnknownFields } from '#tracker_api/entities/index.js';
import { GetIssueLinksParamsSchema } from './get-issue-links.schema.js';

import { GET_ISSUE_LINKS_TOOL_METADATA } from './get-issue-links.metadata.js';

/**
 * Инструмент для получения связей задач
 *
 * Ответственность (SRP):
 * - Координация процесса получения связей задач из Яндекс.Трекера (batch-режим)
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
export class GetIssueLinksTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = GET_ISSUE_LINKS_TOOL_METADATA;

  /**
   * Автоматическая генерация definition из Zod schema
   * Это исключает возможность несоответствия schema ↔ definition
   */
  protected override getParamsSchema(): typeof GetIssueLinksParamsSchema {
    return GetIssueLinksParamsSchema;
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, GetIssueLinksParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueIds, fields, cursor, perPage, fetchAll, maxItems, maxTotalItems } =
      validation.data;

    try {
      // 2. Логирование начала операции
      ResultLogger.logOperationStart(
        this.logger,
        'Получение связей задач',
        issueIds.length,
        fields
      );

      // 3. API v3: получение связей через batch-метод
      const results = await this.facade.getIssueLinks(issueIds, {
        cursor,
        perPage,
        fetchAll,
        maxItems,
        maxTotalItems,
      });

      // 4. Обработка результатов через BatchResultProcessor (с пагинацией).
      // Отчёт детектора незаполненных полей копится внутри filter по мере
      // обработки батча и агрегируется по ВСЕМ успешным задачам сразу
      // (см. paginatedFieldFilter, план `plan_tool_contract_unification`, 2.8).
      const filter = paginatedFieldFilter<LinkWithUnknownFields>(fields);
      const processedResults = BatchResultProcessor.process(results, filter);
      const { fieldsWithoutValue } = filter.getReport();

      // 6. Логирование результатов
      ResultLogger.logBatchResults(
        this.logger,
        'Связи задач получены',
        {
          totalRequested: issueIds.length,
          successCount: processedResults.successful.length,
          failedCount: processedResults.failed.length,
          fieldsCount: fields.length,
        },
        processedResults
      );

      return this.formatSuccess(
        {
          total: issueIds.length,
          successful: processedResults.successful.map((item) => ({
            issueId: item.key,
            links: item.data.items,
            count: item.data.items.length,
            pagination: item.data.pagination,
          })),
          failed: processedResults.failed.map((item) => ({
            issueId: item.key,
            error: item.error,
          })),
        },
        ResponseFieldFilter.toWarnings(fieldsWithoutValue)
      );
    } catch (error: unknown) {
      return this.formatError(`Ошибка при получении связей задач (${issueIds.length} шт.)`, error);
    }
  }
}
