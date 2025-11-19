/**
 * Определение MCP tool для получения URL задачи
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { ISSUE_URL_TOOL_METADATA } from './issue-url.metadata.js';

/**
 * Definition для IssueUrlTool
 *
 * Предоставляет детальное описание для ИИ агента:
 * - Что делает инструмент
 * - Какие параметры принимает
 * - Формат URL
 */
export class IssueUrlDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return ISSUE_URL_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(), // ✅ Single Source of Truth из Tool.METADATA
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          issueKeys: this.buildIssueKeysParam(),
        },
        required: ['issueKeys'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Получить URL задач в веб-интерфейсе Трекера (формат: https://tracker.yandex.ru/{issueKey}). ' +
      'Мгновенное выполнение (БЕЗ запросов к API). Batch-режим: несколько задач одновременно. ' +
      '\n\n' +
      'Для: создания кликабельных ссылок для пользователя, формирования URL для браузера.'
    );
  }

  /**
   * Построить описание параметра issueKeys
   */
  private buildIssueKeysParam(): Record<string, unknown> {
    return this.buildArrayParam(
      '⚠️ ОБЯЗАТЕЛЬНО МАССИВ! Даже для одной задачи используй ["PROJ-123"], НЕ "PROJ-123". ' +
        'Массив ключей в формате QUEUE-123.',
      this.buildStringParam('Ключ задачи', {
        pattern: '^[A-Z][A-Z0-9]+-\\d+$',
        examples: ['PROJ-123'],
      }),
      {
        minItems: 1,
        examples: [['PROJ-123'], ['PROJ-123', 'PROJ-456']],
      }
    );
  }
}
