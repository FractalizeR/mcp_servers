/**
 * Определение MCP tool для получения доступных переходов статусов задачи
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';

import { GET_ISSUE_TRANSITIONS_TOOL_METADATA } from './get-issue-transitions.metadata.js';

/**
 * Definition для GetIssueTransitionsTool
 *
 * Предоставляет детальное описание для ИИ агента:
 * - Что делает инструмент
 * - Какие параметры принимает
 * - Примеры использования
 * - Формат ответа
 */
export class GetIssueTransitionsDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return GET_ISSUE_TRANSITIONS_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(), // ✅ Single Source of Truth из Tool.METADATA
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          issueKey: this.buildIssueKeyParam(),
          fields: this.buildFieldsParam(),
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
      'Получить доступные workflow-переходы для задачи. ' +
      'Возвращает только переходы, доступные из текущего статуса. ' +
      'Параметр fields фильтрует ответ. ' +
      '\n\n' +
      'Для: просмотра доступных переходов статусов, получения ID переходов для execute_transition. ' +
      '\n' +
      'Не для: выполнения перехода (execute_transition), истории изменений (get_issue_changelog).'
    );
  }

  /**
   * Построить описание параметра issueKey
   */
  private buildIssueKeyParam(): Record<string, unknown> {
    return this.buildStringParam('Ключ задачи в формате QUEUE-123 (пример: PROJ-123, DEVOPS-1)', {
      pattern: '^[A-Z][A-Z0-9]+-\\d+$',
      examples: ['PROJ-123'],
    });
  }

  /**
   * Построить описание параметра fields
   */
  private buildFieldsParam(): Record<string, unknown> {
    return this.buildArrayParam(
      'Фильтр полей ответа (опционально, по умолчанию все). ' +
        'Рекомендуется указывать только необходимые поля для экономии токенов (без фильтрации: ~500-1000 токенов/переход, с фильтрацией: ~50-150). ' +
        '\n\n' +
        'Поля: id, self, to, screen. ' +
        'Вложенные (dot-notation): to.key, to.display, screen.id.',
      this.buildStringParam('Имя поля', {
        minLength: 1,
        examples: ['id', 'to', 'to.key', 'to.display', 'screen'],
      }),
      {
        minItems: 1,
        examples: [
          ['id', 'to'],
          ['id', 'to.key', 'to.display'],
        ],
      }
    );
  }
}
