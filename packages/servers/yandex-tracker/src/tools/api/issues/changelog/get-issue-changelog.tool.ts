/**
 * MCP Tool для получения истории изменений задачи из Яндекс.Трекера
 *
 * API Tool (прямой доступ к API):
 * - 1 tool = 1 API вызов (get issue changelog)
 * - Минимальная бизнес-логика
 * - Валидация через Zod
 */

import { BaseTool, ToolCategory } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { ResponseFieldFilter, ResultLogger } from '@mcp-framework/core';
import type { ChangelogEntryWithUnknownFields } from '@tracker_api/entities/index.js';
import { GetIssueChangelogDefinition } from '@tools/api/issues/changelog/get-issue-changelog.definition.js';
import { GetIssueChangelogParamsSchema } from '@tools/api/issues/changelog/get-issue-changelog.schema.js';

import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '../../../../constants.js';

/**
 * Инструмент для получения истории изменений задачи
 *
 * Ответственность (SRP):
 * - Координация процесса получения истории изменений задачи из Яндекс.Трекера
 * - Делегирование валидации в BaseTool
 * - Делегирование фильтрации полей в ResponseFieldFilter
 * - Делегирование логирования в ResultLogger
 * - Форматирование итогового результата
 *
 * Переиспользуемые компоненты:
 * - BaseTool.validateParams() - валидация через Zod
 * - ResponseFieldFilter.filter() - фильтрация полей ответа
 * - ResultLogger - стандартизированное логирование
 */
export class GetIssueChangelogTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = {
    name: buildToolName('get_issue_changelog', MCP_TOOL_PREFIX),
    description: 'Получить историю изменений задачи',
    category: ToolCategory.ISSUES,
    tags: [
      'issue',
      'changelog',
      'history',
      'read',
      'changes',
      'задача',
      'история',
      'изменения',
      'журнал',
    ],
    isHelper: false,
  } as const;

  private readonly definition = new GetIssueChangelogDefinition();

  override getDefinition(): ToolDefinition {
    return this.definition.build();
  }

  async execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, GetIssueChangelogParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueKey, fields } = validation.data;

    try {
      // 2. Логирование начала операции
      ResultLogger.logOperationStart(this.logger, 'Получение истории изменений задачи', 1, fields);

      // 3. API v3: получение истории изменений
      const changelog = await this.facade.getIssueChangelog(issueKey);

      // 4. Фильтрация полей если указаны
      const filteredChangelog = fields
        ? changelog.map((entry) =>
            ResponseFieldFilter.filter<ChangelogEntryWithUnknownFields>(entry, fields)
          )
        : changelog;

      // 5. Логирование результатов
      this.logger.info('История изменений получена', {
        issueKey,
        entriesCount: filteredChangelog.length,
        fieldsCount: fields?.length ?? 'all',
      });

      return this.formatSuccess({
        issueKey,
        totalEntries: filteredChangelog.length,
        changelog: filteredChangelog,
        fieldsReturned: fields ?? 'all',
      });
    } catch (error: unknown) {
      return this.formatError(
        `Ошибка при получении истории изменений задачи ${issueKey}`,
        error as Error
      );
    }
  }
}
