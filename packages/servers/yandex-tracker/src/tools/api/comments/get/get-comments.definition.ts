/**
 * Определение MCP tool для получения комментариев
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { GET_COMMENTS_TOOL_METADATA } from './get-comments.metadata.js';

/**
 * Definition для GetCommentsTool
 */
export class GetCommentsDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return GET_COMMENTS_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.buildDescription(),
      inputSchema: {
        type: 'object',
        properties: {
          issueId: this.buildIssueIdParam(),
          perPage: this.buildPerPageParam(),
          page: this.buildPageParam(),
          expand: this.buildExpandParam(),
          fields: this.buildFieldsParam(),
        },
        required: ['issueId', 'fields'],
      },
    };
  }

  private buildDescription(): string {
    return (
      'Получает комментарии задачи (issueId*, fields*). Поддерживает пагинацию. ' +
      'Параметр fields определяет, какие поля каждого комментария вернуть в ответе (например: ["id", "text", "createdAt"]). ' +
      'Для добавления: add_comment, редактирования: edit_comment, удаления: delete_comment.'
    );
  }

  private buildIssueIdParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. Идентификатор или ключ задачи.', {
      examples: ['TEST-123', 'PROJ-456'],
    });
  }

  private buildPerPageParam(): Record<string, unknown> {
    return this.buildNumberParam(
      'Опциональное количество комментариев на странице (по умолчанию: 50, максимум: 500).',
      {
        minimum: 1,
        maximum: 500,
        examples: [50, 100],
      }
    );
  }

  private buildPageParam(): Record<string, unknown> {
    return this.buildNumberParam('Опциональный номер страницы (начинается с 1).', {
      minimum: 1,
      examples: [1, 2],
    });
  }

  private buildExpandParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Опциональный параметр для включения дополнительных данных (например, "attachments").',
      {
        examples: ['attachments'],
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
        examples: ['id', 'text', 'createdAt', 'createdBy'],
      }),
      {
        minItems: 1,
        examples: [
          ['id', 'text'],
          ['id', 'text', 'createdAt', 'createdBy'],
        ],
      }
    );
  }
}
