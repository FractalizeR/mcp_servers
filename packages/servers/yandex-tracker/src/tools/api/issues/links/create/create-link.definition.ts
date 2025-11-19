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
        },
        required: ['issueId', 'relationship', 'targetIssue'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Создать связь между задачами (subtask, depends, relates, duplicates, epic). ' +
      'API автоматически создаёт обратную связь для целевой задачи. ' +
      '\n\n' +
      'Типы связей:\n' +
      "- 'has subtasks' / 'is subtask of' - родитель/подзадача\n" +
      "- 'depends on' / 'is dependent by' - зависимость/блокировка\n" +
      "- 'relates' - общая связь\n" +
      "- 'duplicates' / 'is duplicated by' - дублирование\n" +
      "- 'has epic' / 'is epic of' - epic связь\n" +
      '\n' +
      'Для: создания связей между задачами. ' +
      '\n' +
      'Не для: получения/удаления связей (get_issue_links, delete_link).'
    );
  }

  /**
   * Построить описание параметра issueId
   */
  private buildIssueIdParam(): Record<string, unknown> {
    return this.buildStringParam('Ключ или ID текущей задачи (формат QUEUE-123 или abc123)', {
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
}
