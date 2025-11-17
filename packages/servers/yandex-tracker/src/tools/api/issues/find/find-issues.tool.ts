/**
 * MCP Tool для поиска задач в Яндекс.Трекере
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (POST /v3/issues/_search)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool, ToolCategory } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { ResponseFieldFilter, ResultLogger } from '@mcp-framework/core';
import type { IssueWithUnknownFields } from '@tracker_api/entities/index.js';
import { FindIssuesDefinition } from '@tools/api/issues/find/find-issues.definition.js';
import { FindIssuesParamsSchema } from '@tools/api/issues/find/find-issues.schema.js';

import { buildToolName } from '@mcp-framework/core';
/**
 * Инструмент для поиска задач
 *
 * Ответственность (SRP):
 * - Координация процесса поиска задач в Яндекс.Трекере
 * - Делегирование валидации в BaseTool
 * - Делегирование логирования в ResultLogger
 * - Форматирование итогового результата
 *
 * Переиспользуемые компоненты:
 * - BaseTool.validateParams() - валидация через Zod
 * - ResultLogger - стандартизированное логирование
 * - ResponseFieldFilter - фильтрация полей ответа
 */
export class FindIssuesTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = {
    name: buildToolName('find_issues'),
    description: 'Найти задачи по JQL запросу',
    category: ToolCategory.ISSUES,
    tags: ['issue', 'find', 'search', 'jql', 'query'],
    isHelper: false,
  } as const;

  private readonly definition = new FindIssuesDefinition();

  override getDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, FindIssuesParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { fields, ...searchParams } = validation.data;

    try {
      // 2. Логирование начала операции
      ResultLogger.logOperationStart(
        this.logger,
        'Поиск задач',
        searchParams.keys?.length ?? 0,
        fields
      );
      this.logger.debug('Параметры поиска:', {
        hasQuery: !!searchParams.query,
        hasFilter: !!searchParams.filter,
        keysCount: searchParams.keys?.length,
        hasQueue: !!searchParams.queue,
        hasFilterId: !!searchParams.filterId,
        perPage: searchParams.perPage,
      });

      // 3. API v3: поиск задач через findIssues
      // Строим объект с условным добавлением свойств для совместимости с exactOptionalPropertyTypes
      const issues = await this.facade.findIssues({
        ...(searchParams.query && { query: searchParams.query }),
        ...(searchParams.filter && { filter: searchParams.filter }),
        ...(searchParams.keys && { keys: searchParams.keys }),
        ...(searchParams.queue && { queue: searchParams.queue }),
        ...(searchParams.filterId && { filterId: searchParams.filterId }),
        ...(searchParams.order && { order: searchParams.order }),
        ...(searchParams.perPage !== undefined && { perPage: searchParams.perPage }),
        ...(searchParams.page !== undefined && { page: searchParams.page }),
        ...(searchParams.expand && { expand: searchParams.expand }),
      });

      // 4. Фильтрация полей (если указаны)
      const filteredIssues = fields
        ? issues.map((issue) => ResponseFieldFilter.filter<IssueWithUnknownFields>(issue, fields))
        : issues;

      // 5. Логирование результатов
      this.logger.info('Задачи найдены', {
        count: issues.length,
        fieldsCount: fields?.length ?? 'all',
      });

      return this.formatSuccess({
        count: issues.length,
        issues: filteredIssues,
        fieldsReturned: fields ?? 'all',
        searchCriteria: {
          hasQuery: !!searchParams.query,
          hasFilter: !!searchParams.filter,
          keysCount: searchParams.keys?.length ?? 0,
          hasQueue: !!searchParams.queue,
          perPage: searchParams.perPage ?? 50,
        },
      });
    } catch (error: unknown) {
      return this.formatError('Ошибка при поиске задач', error as Error);
    }
  }
}
