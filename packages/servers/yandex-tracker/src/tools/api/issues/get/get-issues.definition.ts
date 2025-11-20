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
        required: ['issueKeys', 'fields'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Получает детали задач по ключам. Batch-режим: до 100 задач за раз. ' +
      'Параметр fields обязателен для экономии токенов. Partial success: возвращает успешные даже при частичных ошибках. ' +
      'Для поиска: find_issues.'
    );
  }

  /**
   * Построить описание параметра issueKeys
   */
  private buildIssueKeysParam(): Record<string, unknown> {
    return this.buildArrayParam(
      'Массив ключей задач (QUEUE-123), до 100 элементов',
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
      'Поля для возврата. Указывайте минимум для экономии токенов.',
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
