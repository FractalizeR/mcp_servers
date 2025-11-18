/**
 * Определение MCP tool для получения связей задачи
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { GetIssueLinksTool } from './get-issue-links.tool.js';

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
    return GetIssueLinksTool.METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          issueId: this.buildIssueIdParam(),
        },
        required: ['issueId'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Получить все связи задачи (subtask, depends, relates, duplicates, epic). ' +
      'Возвращает массив связей с информацией о типе, направлении и связанной задаче. ' +
      '\n\n' +
      'Для: просмотра связей задачи, анализа зависимостей, поиска подзадач. ' +
      '\n' +
      'Не для: создания/удаления связей (create_link, delete_link).'
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
}
