/**
 * Определение MCP tool для удаления комментария
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { DELETE_COMMENT_TOOL_METADATA } from './delete-comment.metadata.js';

/**
 * Definition для DeleteCommentTool
 */
export class DeleteCommentDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return DELETE_COMMENT_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          issueId: this.buildIssueIdParam(),
          commentId: this.buildCommentIdParam(),
        },
        required: ['issueId', 'commentId'],
      },
    };
  }

  private buildDescription(): string {
    return (
      '⚠️ ДЕСТРУКТИВНАЯ ОПЕРАЦИЯ. Удаляет комментарий (issueId*, commentId*). ' +
      'Операция необратима. ' +
      'Для добавления: add_comment, получения: get_comments, редактирования: edit_comment.'
    );
  }

  private buildIssueIdParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. Ключ задачи (QUEUE-123)', {
      examples: ['TEST-123', 'PROJ-456'],
    });
  }

  private buildCommentIdParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. Идентификатор комментария для удаления.', {
      examples: ['12345', '67890'],
    });
  }
}
