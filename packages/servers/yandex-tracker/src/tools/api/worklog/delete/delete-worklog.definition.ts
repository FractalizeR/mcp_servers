/**
 * Определение MCP tool для удаления записи времени
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { DELETE_WORKLOG_TOOL_METADATA } from './delete-worklog.metadata.js';

/**
 * Definition для DeleteWorklogTool
 */
export class DeleteWorklogDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return DELETE_WORKLOG_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.buildDescription(),
      inputSchema: {
        type: 'object',
        properties: {
          issueId: this.buildIssueIdParam(),
          worklogId: this.buildWorklogIdParam(),
        },
        required: ['issueId', 'worklogId'],
      },
    };
  }

  private buildDescription(): string {
    return (
      'Удаляет запись времени (worklog) задачи. ' +
      '⚠️ ВНИМАНИЕ: Операция необратима! ' +
      'Для получения: get_worklogs, добавления: add_worklog, редактирования: update_worklog.'
    );
  }

  private buildIssueIdParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. Ключ задачи (QUEUE-123)', {
      examples: ['TEST-123', 'PROJ-456'],
    });
  }

  private buildWorklogIdParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. Идентификатор записи времени для удаления.', {
      examples: ['123', '456'],
    });
  }
}
