/**
 * Определение MCP tool для получения URL задачи
 */

import { BaseToolDefinition, type ToolDefinition } from '@mcp/tools/base/index.js';
import { buildToolName } from '@mcp/tools/common/utils/index.js';

/**
 * Definition для IssueUrlTool
 *
 * Предоставляет детальное описание для ИИ агента:
 * - Что делает инструмент
 * - Какие параметры принимает
 * - Формат URL
 */
export class IssueUrlDefinition extends BaseToolDefinition {
  build(): ToolDefinition {
    return {
      name: buildToolName('get_issue_url'),
      description: this.buildDescription(),
      inputSchema: {
        type: 'object',
        properties: {
          issueKey: this.buildIssueKeyParam(),
        },
        required: ['issueKey'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Получение URL задачи в веб-интерфейсе Яндекс.Трекера. ' +
      '\n\n' +
      'Особенности:\n' +
      '- НЕ делает запросов к API (мгновенное выполнение)\n' +
      '- Формирует URL для открытия задачи в браузере\n' +
      '- Работает с любыми задачами (даже удалёнными)\n' +
      '\n' +
      'Используй этот инструмент когда нужно:\n' +
      '- Получить ссылку на задачу для пользователя\n' +
      '- Сформировать URL для открытия в браузере\n' +
      '- Создать кликабельную ссылку в ответе\n' +
      '\n' +
      'Формат URL: https://tracker.yandex.ru/{issueKey}'
    );
  }

  /**
   * Построить описание параметра issueKey
   */
  private buildIssueKeyParam(): Record<string, unknown> {
    return this.buildStringParam('Ключ задачи в формате QUEUE-123', {
      pattern: '^[A-Z][A-Z0-9]+-\\d+$',
      examples: ['PROJ-123', 'DEVOPS-456', 'TEST-1'],
    });
  }
}
