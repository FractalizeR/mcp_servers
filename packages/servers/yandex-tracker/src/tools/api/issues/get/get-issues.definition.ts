/**
 * Определение MCP tool для получения задач
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { GET_ISSUES_TOOL_METADATA } from './get-issues.metadata.js';
/**
 * Definition для GetIssuesTool
 *
 * Предоставляет детальное описание для ИИ агента:
 * - Что делает инструмент
 * - Какие параметры принимает
 * - Примеры использования
 * - Формат ответа
 */
export class GetIssuesDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return GET_ISSUES_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(), // ✅ Single Source of Truth из Tool.METADATA
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          issueKeys: this.buildIssueKeysParam(),
          fields: this.buildFieldsParam(),
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
      'Получить задачи по ключам. Batch-режим: до 100 задач за раз. ' +
      'Параметр fields фильтрует ответ. Partial success: возвращает успешные даже при частичных ошибках. ' +
      '\n\n' +
      'Для: получения детальной информации о конкретных задачах. ' +
      '\n' +
      'Не для: поиска по критериям (find_issues).'
    );
  }

  /**
   * Построить описание параметра issueKeys
   */
  private buildIssueKeysParam(): Record<string, unknown> {
    return this.buildArrayParam(
      '⚠️ ОБЯЗАТЕЛЬНО МАССИВ! Даже для одной задачи используй ["PROJ-123"], НЕ "PROJ-123". ' +
        'Массив ключей в формате QUEUE-123 (до 100 задач).',
      this.buildStringParam('Ключ задачи', {
        pattern: '^[A-Z][A-Z0-9]+-\\d+$',
        examples: ['PROJ-123'],
      }),
      {
        minItems: 1,
        maxItems: 100,
        examples: [['PROJ-123'], ['PROJ-123', 'PROJ-456']],
      }
    );
  }

  /**
   * Построить описание параметра fields
   */
  private buildFieldsParam(): Record<string, unknown> {
    return this.buildArrayParam(
      'Фильтр полей ответа (опционально, по умолчанию все). ' +
        'Рекомендуется указывать только необходимые поля для экономии токенов (без фильтрации: ~2000-5000 токенов/задача, с фильтрацией: ~200-500). ' +
        '\n\n' +
        'Поля: key, summary, description, status, priority, type, assignee, author, queue, project, sprint, epic, tags, ' +
        'createdAt, updatedAt, statusStartTime, start, end, followers, commentWithoutExternalMessageCount, votes. ' +
        'Вложенные (dot-notation): assignee.login, assignee.display, status.key, queue.key, priority.key, type.key.',
      this.buildStringParam('Имя поля', {
        minLength: 1,
        examples: ['key', 'summary', 'status', 'assignee.login'],
      }),
      {
        minItems: 1,
        examples: [
          ['key', 'summary', 'status'],
          ['key', 'summary', 'assignee.login', 'status.key', 'createdAt'],
        ],
      }
    );
  }
}
