/**
 * MCP Tool для поиска задач в Яндекс.Трекере
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (POST /v3/issues/_search)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool } from '@mcp/tools/base/index.js';
import type { ToolDefinition } from '@mcp/tools/base/index.js';
import type { ToolCallParams, ToolResult } from '@types';
import { ResponseFieldFilter, ResultLogger } from '@mcp/utils/index.js';
import type { IssueWithUnknownFields } from '@tracker_api/entities/index.js';
import { FindIssuesDefinition } from '@mcp/tools/api/issues/find/find-issues.definition.js';
import { FindIssuesParamsSchema } from '@mcp/tools/api/issues/find/find-issues.schema.js';
import type { FindIssuesInputDto } from '@tracker_api/dto/index.js';

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
export class FindIssuesTool extends BaseTool {
  private readonly definition = new FindIssuesDefinition();

  getDefinition(): ToolDefinition {
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
      const inputDto: FindIssuesInputDto = searchParams;
      const issues = await this.trackerFacade.findIssues(inputDto);

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
