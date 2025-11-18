/**
 * Определение MCP tool для получения истории изменений задачи
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';

import { GetIssueChangelogTool } from './get-issue-changelog.tool.js';

/**
 * Definition для GetIssueChangelogTool
 *
 * Предоставляет детальное описание для ИИ агента:
 * - Что делает инструмент
 * - Какие параметры принимает
 * - Примеры использования
 * - Формат ответа
 */
export class GetIssueChangelogDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return GetIssueChangelogTool.METADATA;
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
      'Получить историю изменений задачи в хронологическом порядке. ' +
      'Показывает кто, когда и какие поля изменил со старыми/новыми значениями. ' +
      'Параметр fields фильтрует ответ. ' +
      '\n\n' +
      'Для: просмотра истории изменений, аудита, отслеживания изменений статуса/приоритета. ' +
      '\n' +
      'Не для: текущего состояния (get_issues), комментариев (отдельный инструмент).'
    );
  }

  /**
   * Построить описание параметра issueKey
   */
  private buildIssueKeyParam(): Record<string, unknown> {
    return this.buildStringParam('Ключ задачи для получения истории изменений', {
      pattern: '^[A-Z][A-Z0-9]+-\\d+$',
      examples: ['PROJ-123', 'ABC-456', 'TEST-1'],
    });
  }

  /**
   * Построить описание параметра fields
   */
  private buildFieldsParam(): Record<string, unknown> {
    return this.buildArrayParam(
      'Фильтр полей ответа (опционально, по умолчанию все). ' +
        'Рекомендуется указывать только необходимые поля для экономии токенов (без фильтрации: ~1000-3000 токенов/запись, с фильтрацией: ~100-300). ' +
        '\n\n' +
        'Поля: id, updatedAt, updatedBy, type, transport, fields, issue, attachments, comments, worklog, messages, links, ranks. ' +
        'Типичные type: IssueUpdated, IssueCreated, IssueMoved. Типичные transport: web, email, api. ' +
        'Вложенные (dot-notation): updatedBy.login, updatedBy.display, issue.key.',
      this.buildStringParam('Имя поля', {
        minLength: 1,
        examples: ['id', 'updatedAt', 'updatedBy', 'type', 'fields'],
      }),
      {
        minItems: 1,
        examples: [
          ['id', 'updatedAt', 'updatedBy', 'type'],
          ['id', 'updatedAt', 'updatedBy.login', 'type', 'fields'],
        ],
      }
    );
  }
}
