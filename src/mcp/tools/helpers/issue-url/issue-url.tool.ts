/**
 * MCP Tool для получения URL задачи в веб-интерфейсе Трекера
 *
 * Helper Tool (утилита):
 * - НЕ делает запросов к API
 * - Формирует URL по ключу задачи
 * - Мгновенное выполнение
 */

import { BaseTool, ToolCategory } from '@mcp/tools/base/index.js';
import type { ToolDefinition } from '@mcp/tools/base/index.js';
import type { ToolCallParams, ToolResult } from '@types';
import { IssueUrlDefinition } from '@mcp/tools/helpers/issue-url/issue-url.definition.js';
import { IssueUrlParamsSchema } from '@mcp/tools/helpers/issue-url/issue-url.schema.js';
import { buildToolName } from '@mcp/tools/common/utils/index.js';

/**
 * Инструмент для получения URL задачи
 *
 * Ответственность (SRP):
 * - Валидация ключа задачи
 * - Формирование URL для веб-интерфейса
 * - Форматирование результата
 *
 * ВАЖНО: НЕ делает запросов к API (работает локально)
 */
export class IssueUrlTool extends BaseTool {
  /**
   * Статические метаданные для compile-time индексации
   */
  static override readonly METADATA = {
    name: buildToolName('get_issue_url'),
    description: 'Получить URL задачи в Яндекс.Трекере',
    category: ToolCategory.URL_GENERATION,
    tags: ['url', 'link', 'helper', 'issue'],
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

    const { issueKey } = validation.data;

    // 2. Формирование URL (без API запросов)
    const url = `${this.TRACKER_BASE_URL}/${issueKey}`;

    this.logger.info(`URL задачи сформирован: ${url}`);

    // 3. Возврат результата
    return this.formatSuccess({
      issueKey,
      url,
      description: `Открыть задачу ${issueKey} в браузере`,
    });
  }
}
