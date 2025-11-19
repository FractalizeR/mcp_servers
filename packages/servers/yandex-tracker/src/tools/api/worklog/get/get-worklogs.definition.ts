/**
 * Определение MCP tool для получения записей времени
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { GET_WORKLOGS_TOOL_METADATA } from './get-worklogs.metadata.js';

/**
 * Definition для GetWorklogsTool
 */
export class GetWorklogsDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return GET_WORKLOGS_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.buildDescription(),
      inputSchema: {
        type: 'object',
        properties: {
          issueId: this.buildIssueIdParam(),
        },
        required: ['issueId'],
      },
    };
  }

  private buildDescription(): string {
    return (
      'Получить список записей времени (worklog) задачи. ' +
      'Возвращает все записи времени, затраченного на выполнение задачи. ' +
      '\n\n' +
      'Для: получения учета времени задачи, просмотра затраченных часов. ' +
      '\n' +
      'Не для: добавления (add_worklog), редактирования (update_worklog), удаления (delete_worklog).'
    );
  }

  private buildIssueIdParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. Идентификатор или ключ задачи.', {
      examples: ['TEST-123', 'PROJ-456'],
    });
  }
}
