/**
 * Определение MCP tool для удаления комментария
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { DeleteCommentTool } from './delete-comment.tool.js';

/**
 * Definition для DeleteCommentTool
 */
export class DeleteCommentDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return DeleteCommentTool.METADATA;
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
      '⚠️ ДЕСТРУКТИВНАЯ ОПЕРАЦИЯ. Удалить комментарий. Все поля обязательны. ' +
      'Операция необратима. ' +
      '\n\n' +
      'Для: удаления комментария из задачи. ' +
      '\n' +
      'Не для: добавления (add_comment), получения (get_comments), редактирования (edit_comment).'
    );
  }

  private buildIssueIdParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. Идентификатор или ключ задачи.', {
      examples: ['TEST-123', 'PROJ-456'],
    });
  }

  private buildCommentIdParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. Идентификатор комментария для удаления.', {
      examples: ['12345', '67890'],
    });
  }
}
