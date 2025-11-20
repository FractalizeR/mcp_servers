/**
 * Определение MCP tool для получения связей задачи
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { GET_ISSUE_LINKS_TOOL_METADATA } from './get-issue-links.metadata.js';

/**
 * Definition для GetIssueLinksTool
 *
 * Предоставляет детальное описание для ИИ агента:
 * - Что делает инструмент
 * - Какие параметры принимает
 * - Примеры использования
 * - Формат ответа
 */
export class GetIssueLinksDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return GET_ISSUE_LINKS_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          issueId: this.buildIssueIdParam(),
          fields: this.buildFieldsParam(),
        },
        required: ['issueId', 'fields'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Получает связи задачи (issueId*, fields*). Типы: subtask, depends, relates, duplicates, epic. ' +
      'Возвращает массив связей с информацией о типе, направлении и связанной задаче. ' +
      'Параметр fields определяет, какие поля каждой связи вернуть в ответе (например: ["id", "type", "object"]). ' +
      'Для создания/удаления: create_link, delete_link.'
    );
  }

  /**
   * Построить описание параметра issueId
   */
  private buildIssueIdParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Ключ или ID задачи для получения связей (формат QUEUE-123 или abc123)',
      {
        pattern: '^([A-Z][A-Z0-9]+-\\d+|[a-f0-9]+)$',
        examples: ['PROJ-123', 'abc123def456'],
      }
    );
  }

  /**
   * Построить описание параметра fields
   */
  private buildFieldsParam(): Record<string, unknown> {
    return this.buildArrayParam(
      '⚠️ ОБЯЗАТЕЛЬНЫЙ. Массив полей для возврата в результате. ' +
        'Указывайте только необходимые поля для экономии токенов. ' +
        '\n\n' +
        'Доступные поля: id, type, direction, object, createdBy, createdAt, updatedBy, updatedAt.',
      {
        items: { type: 'string' },
        examples: [
          ['id', 'type', 'object'],
          ['id', 'type', 'direction', 'object'],
          ['id', 'type.id', 'object.key', 'object.display'],
        ],
      }
    );
  }
}
