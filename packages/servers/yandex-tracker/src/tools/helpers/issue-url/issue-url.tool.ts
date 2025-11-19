/**
 * MCP Tool для получения URL задач в веб-интерфейсе Трекера
 *
 * Helper Tool (утилита):
 * - НЕ делает запросов к API
 * - Формирует URL по ключам задач
 * - Мгновенное выполнение
 * - Batch-режим: обработка нескольких задач одновременно
 */

import { BaseTool } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { IssueUrlDefinition } from '@tools/helpers/issue-url/issue-url.definition.js';
import { IssueUrlParamsSchema } from '@tools/helpers/issue-url/issue-url.schema.js';

import { ISSUE_URL_TOOL_METADATA } from './issue-url.metadata.js';

/**
 * Инструмент для получения URL задач
 *
 * Ответственность (SRP):
 * - Валидация ключей задач
 * - Формирование URL для веб-интерфейса
 * - Форматирование результата
 *
 * ВАЖНО: НЕ делает запросов к API (работает локально)
 */
export class IssueUrlTool extends BaseTool<YandexTrackerFacade> {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = ISSUE_URL_TOOL_METADATA;

  private readonly definition = new IssueUrlDefinition();
  private readonly TRACKER_BASE_URL = 'https://tracker.yandex.ru';

  protected buildDefinition(): ToolDefinition {
    return this.definition.build();
  }

  execute(params: ToolCallParams): Promise<ToolResult> {
    // 1. Валидация параметров через BaseTool
    const validation = this.validateParams(params, IssueUrlParamsSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { issueKeys } = validation.data;

    // 2. Формирование URL для каждой задачи (без API запросов)
    const results = issueKeys.map((issueKey: string) => ({
      issueKey,
      url: `${this.TRACKER_BASE_URL}/${issueKey}`,
      description: `Открыть задачу ${issueKey} в браузере`,
    }));

    this.logger.info(`URL сформированы для ${issueKeys.length} задач: ${issueKeys.join(', ')}`);

    // 3. Возврат результата
    return this.formatSuccess({
      count: results.length,
      urls: results,
    });
  }
}
