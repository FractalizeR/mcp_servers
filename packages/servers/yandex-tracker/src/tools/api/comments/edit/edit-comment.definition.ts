/**
 * Определение MCP tool для редактирования комментария
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { EDIT_COMMENT_TOOL_METADATA } from './edit-comment.metadata.js';

/**
 * Definition для EditCommentTool
 */
export class EditCommentDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return EDIT_COMMENT_TOOL_METADATA;
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
          fields: this.buildFieldsParam(),
        },
        required: ['issueId', 'commentId', 'text', 'fields'],
      },
    };
  }

  private buildDescription(): string {
    return (
      'Редактирует комментарий (issueId*, commentId*, text*, fields*). ' +
      'Параметр fields определяет, какие поля обновленного комментария вернуть в ответе (например: ["id", "text", "updatedAt"]). ' +
      'Для добавления: add_comment, получения: get_comments, удаления: delete_comment.'
    );
  }

  private buildIssueIdParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. Ключ задачи (QUEUE-123)', {
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

  private buildFieldsParam(): Record<string, unknown> {
    return this.buildArrayParam(
      '⚠️ ОБЯЗАТЕЛЬНЫЙ. Фильтр полей ответа. ' +
        'Указывайте только необходимые поля для экономии токенов. ' +
        '\n\n' +
        'Доступные поля: id, text, createdAt, updatedAt, createdBy, updatedBy, version.',
      this.buildStringParam('Имя поля', {
        minLength: 1,
        examples: ['id', 'text', 'createdAt', 'updatedBy'],
      }),
      {
        minItems: 1,
        examples: [
          ['id', 'text'],
          ['id', 'text', 'updatedAt', 'version'],
        ],
      }
    );
  }
}
