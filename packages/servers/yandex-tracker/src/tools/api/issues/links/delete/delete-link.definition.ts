/**
 * Определение MCP tool для удаления связи между задачами
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { DELETE_LINK_TOOL_METADATA } from './delete-link.metadata.js';

/**
 * Definition для DeleteLinkTool
 *
 * Предоставляет детальное описание для ИИ агента:
 * - Что делает инструмент
 * - Какие параметры принимает
 * - Примеры использования
 * - Формат ответа
 */
export class DeleteLinkDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return DELETE_LINK_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          issueId: this.buildIssueIdParam(),
          linkId: this.buildLinkIdParam(),
        },
        required: ['issueId', 'linkId'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Удалить связь между задачами. ' +
      'API автоматически удаляет обратную связь для связанной задачи. ' +
      'ID связи можно получить через get_issue_links. ' +
      '\n\n' +
      'Для: удаления связей между задачами. ' +
      '\n' +
      'Не для: создания/получения связей (create_link, get_issue_links).'
    );
  }

  /**
   * Построить описание параметра issueId
   */
  private buildIssueIdParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Ключ или ID задачи, из которой удаляется связь (формат QUEUE-123 или abc123)',
      {
        pattern: '^([A-Z][A-Z0-9]+-\\d+|[a-f0-9]+)$',
        examples: ['PROJ-123', 'abc123def456'],
      }
    );
  }

  /**
   * Построить описание параметра linkId
   */
  private buildLinkIdParam(): Record<string, unknown> {
    return this.buildStringParam('ID связи для удаления (получить через get_issue_links)', {
      minLength: 1,
      examples: ['67890', 'link123abc'],
    });
  }
}
