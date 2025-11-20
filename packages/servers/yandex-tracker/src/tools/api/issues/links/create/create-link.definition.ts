/**
 * Определение MCP tool для создания связи между задачами
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { CREATE_LINK_TOOL_METADATA } from './create-link.metadata.js';

/**
 * Definition для CreateLinkTool
 *
 * Предоставляет детальное описание для ИИ агента:
 * - Что делает инструмент
 * - Какие параметры принимает
 * - Примеры использования
 * - Формат ответа
 */
export class CreateLinkDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return CREATE_LINK_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          issueId: this.buildIssueIdParam(),
          relationship: this.buildRelationshipParam(),
          targetIssue: this.buildTargetIssueParam(),
          fields: this.buildFieldsParam(),
        },
        required: ['issueId', 'relationship', 'targetIssue', 'fields'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Создаёт связь (issueId*, relationship*, targetIssue*, fields*). Типы: subtask, depends, relates, duplicates, epic. ' +
      'API автоматически создаёт обратную связь для целевой задачи. ' +
      'Параметр fields определяет, какие поля созданной связи вернуть в ответе (например: ["id", "type", "object"]). ' +
      "Типы связей: 'has subtasks', 'is subtask of', 'depends on', 'is dependent by', 'relates', 'duplicates', 'is duplicated by', 'has epic', 'is epic of'. " +
      'Для получения/удаления: get_issue_links, delete_link.'
    );
  }

  /**
   * Построить описание параметра issueId
   */
  private buildIssueIdParam(): Record<string, unknown> {
    return this.buildStringParam('Ключ задачи (QUEUE-123)', {
      pattern: '^([A-Z][A-Z0-9]+-\\d+|[a-f0-9]+)$',
      examples: ['PROJ-123', 'abc123def456'],
    });
  }

  /**
   * Построить описание параметра relationship
   */
  private buildRelationshipParam(): Record<string, unknown> {
    return {
      type: 'string',
      description:
        'Тип и направление связи от текущей задачи. ' +
        'ВАЖНО: relationship определяет направление связи. ' +
        "Например, 'has subtasks' означает что текущая задача будет родителем.",
      enum: [
        'relates',
        'is duplicated by',
        'duplicates',
        'is subtask of',
        'has subtasks',
        'depends on',
        'is dependent by',
        'is epic of',
        'has epic',
      ],
      examples: ['has subtasks', 'depends on', 'relates'],
    };
  }

  /**
   * Построить описание параметра targetIssue
   */
  private buildTargetIssueParam(): Record<string, unknown> {
    return this.buildStringParam('Ключ или ID связываемой задачи (формат QUEUE-123 или abc123)', {
      pattern: '^([A-Z][A-Z0-9]+-\\d+|[a-f0-9]+)$',
      examples: ['PROJ-456', 'def789ghi012'],
    });
  }

  /**
   * Построить описание параметра fields
   */
  private buildFieldsParam(): Record<string, unknown> {
    return this.buildArrayParam(
      '⚠️ ОБЯЗАТЕЛЬНЫЙ. Массив полей для возврата в результате. ' +
        'Указывайте только необходимые поля для экономии токенов. ' +
        '\n\n' +
        'Доступные поля: id, type, direction, object, createdBy, createdAt.',
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
