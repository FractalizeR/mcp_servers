/**
 * MCP Tool для получения URL задач в веб-интерфейсе Трекера
 *
 * Helper Tool (утилита):
 * - НЕ делает запросов к API
 * - Формирует URL по ключам задач
 * - Мгновенное выполнение
 * - Batch-режим: обработка нескольких задач одновременно
 */

import { BaseTool, ToolCategory } from '@mcp-framework/core';
import type { YandexTrackerFacade } from '@tracker_api/facade/index.js';
import type { ToolDefinition } from '@mcp-framework/core';
import type { ToolCallParams, ToolResult } from '@mcp-framework/infrastructure';
import { IssueUrlDefinition } from '@tools/helpers/issue-url/issue-url.definition.js';
import { IssueUrlParamsSchema } from '@tools/helpers/issue-url/issue-url.schema.js';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '../../../constants.js';

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
  static override readonly METADATA = {
    name: buildToolName('get_issue_urls', MCP_TOOL_PREFIX),
    description: 'Получить URL задач в Яндекс.Трекере',
    category: ToolCategory.URL_GENERATION,
    tags: ['url', 'link', 'helper', 'issue', 'batch'],
    isHelper: true,
  } as const;

  private readonly definition = new IssueUrlDefinition();
  private readonly TRACKER_BASE_URL = 'https://tracker.yandex.ru';

  override getDefinition(): ToolDefinition {
    return this.definition.build();
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- синхронная операция, но возвращает Promise по контракту
  async execute(params: ToolCallParams): Promise<ToolResult> {
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
