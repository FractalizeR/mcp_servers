/**
 * MCP Tool для получения URL задачи в веб-интерфейсе Трекера
 *
 * Helper Tool (утилита):
 * - НЕ делает запросов к API
 * - Формирует URL по ключу задачи
 * - Мгновенное выполнение
 */

import { BaseTool } from '@mcp/tools/base/index.js';
import type { ToolDefinition } from '@mcp/tools/base/index.js';
import type { ToolCallParams, ToolResult } from '@types';
import { IssueUrlDefinition } from '@mcp/tools/helpers/issue-url/issue-url.definition.js';
import { IssueUrlParamsSchema } from '@mcp/tools/helpers/issue-url/issue-url.schema.js';

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
  private readonly definition = new IssueUrlDefinition();
  private readonly TRACKER_BASE_URL = 'https://tracker.yandex.ru';

  getDefinition(): ToolDefinition {
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
