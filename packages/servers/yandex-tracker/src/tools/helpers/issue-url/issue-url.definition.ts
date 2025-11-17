/**
 * Определение MCP tool для получения URL задачи
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { buildToolName } from '@mcp-framework/core';
import { MCP_TOOL_PREFIX } from '../../../constants.js';
import { IssueUrlTool } from './issue-url.tool.js';

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
    return IssueUrlTool.METADATA;
  }

  build(): ToolDefinition {
    return {
      name: buildToolName('get_issue_urls', MCP_TOOL_PREFIX),
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
      'Получение URL задач в веб-интерфейсе Яндекс.Трекера. ' +
      '\n\n' +
      '⚠️ ФОРМАТ ПАРАМЕТРОВ:\n' +
      '```json\n' +
      '{\n' +
      '  "issueKeys": ["PROJ-123", "PROJ-456"]\n' +
      '}\n' +
      '```\n' +
      '\n' +
      'Для одной задачи используй массив из одного элемента:\n' +
      '```json\n' +
      '{\n' +
      '  "issueKeys": ["PROJ-123"]\n' +
      '}\n' +
      '```\n' +
      '\n' +
      'Особенности:\n' +
      '- НЕ делает запросов к API (мгновенное выполнение)\n' +
      '- Формирует URL для открытия задач в браузере\n' +
      '- Работает с любыми задачами (даже удалёнными)\n' +
      '- Batch-режим: можно получить URL для нескольких задач одновременно\n' +
      '\n' +
      'Используй этот инструмент когда нужно:\n' +
      '- Получить ссылки на задачи для пользователя\n' +
      '- Сформировать URL для открытия в браузере\n' +
      '- Создать кликабельные ссылки в ответе\n' +
      '\n' +
      'Формат URL: https://tracker.yandex.ru/{issueKey}'
    );
  }

  /**
   * Построить описание параметра issueKeys
   */
  private buildIssueKeysParam(): Record<string, unknown> {
    return this.buildArrayParam(
      '⚠️ ОБЯЗАТЕЛЬНО МАССИВ! Даже для одной задачи используй ["PROJ-123"], НЕ "PROJ-123".\n' +
        '\n' +
        'Правильные примеры:\n' +
        '✅ ["PROJ-123"] - одна задача\n' +
        '✅ ["PROJ-123", "PROJ-456"] - несколько задач\n' +
        '\n' +
        'Неправильные примеры:\n' +
        '❌ "PROJ-123" - это НЕ массив, будет ошибка!\n' +
        '❌ {"issueKey": "PROJ-123"} - неверная структура',
      this.buildStringParam('Ключ задачи', {
        pattern: '^[A-Z][A-Z0-9]+-\\d+$',
        examples: ['PROJ-123', 'DEVOPS-456', 'TEST-1'],
      }),
      {
        minItems: 1,
        examples: [['PROJ-123'], ['PROJ-123', 'PROJ-456']],
      }
    );
  }
}
