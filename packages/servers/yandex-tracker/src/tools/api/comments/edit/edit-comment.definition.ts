/**
 * Определение MCP tool для редактирования комментария
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { EditCommentTool } from './edit-comment.tool.js';

/**
 * Definition для EditCommentTool
 */
export class EditCommentDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return EditCommentTool.METADATA;
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
          text: this.buildTextParam(),
        },
        required: ['issueId', 'commentId', 'text'],
      },
    };
  }

  private buildDescription(): string {
    return (
      'Редактировать существующий комментарий. Все поля обязательны. ' +
      '\n\n' +
      'Для: изменения текста существующего комментария. ' +
      '\n' +
      'Не для: добавления (add_comment), получения (get_comments), удаления (delete_comment).'
    );
  }

  private buildIssueIdParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. Идентификатор или ключ задачи.', {
      examples: ['TEST-123', 'PROJ-456'],
    });
  }

  private buildCommentIdParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. Идентификатор комментария для редактирования.', {
      examples: ['12345', '67890'],
    });
  }

  private buildTextParam(): Record<string, unknown> {
    return this.buildStringParam(
      '⚠️ ОБЯЗАТЕЛЬНЫЙ. Новый текст комментария. Поддерживает markdown форматирование.',
      {
        examples: [
          'Обновленный текст комментария',
          '## Исправление\n\nИсправлена ошибка в описании.',
        ],
      }
    );
  }
}
