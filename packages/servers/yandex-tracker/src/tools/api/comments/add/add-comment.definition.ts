/**
 * Определение MCP tool для добавления комментария
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { ADD_COMMENT_TOOL_METADATA } from './add-comment.metadata.js';

/**
 * Definition для AddCommentTool
 *
 * Предоставляет детальное описание для ИИ агента:
 * - Что делает инструмент
 * - Какие параметры принимает
 * - Примеры использования
 * - Формат ответа
 */
export class AddCommentDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return ADD_COMMENT_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          issueId: this.buildIssueIdParam(),
          text: this.buildTextParam(),
          attachmentIds: this.buildAttachmentIdsParam(),
          fields: this.buildFieldsParam(),
        },
        required: ['issueId', 'text', 'fields'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Добавляет комментарий (issueId*, text*, fields*, attachmentIds). ' +
      'Параметр fields определяет, какие поля комментария вернуть в ответе (например: ["id", "text", "createdAt"]). ' +
      'Для редактирования: edit_comment, получения: get_comments, удаления: delete_comment.'
    );
  }

  /**
   * Построить описание параметра issueId
   */
  private buildIssueIdParam(): Record<string, unknown> {
    return this.buildStringParam('⚠️ ОБЯЗАТЕЛЬНЫЙ. Ключ задачи (QUEUE-123)', {
      examples: ['TEST-123', 'PROJ-456'],
    });
  }

  /**
   * Построить описание параметра text
   */
  private buildTextParam(): Record<string, unknown> {
    return this.buildStringParam(
      '⚠️ ОБЯЗАТЕЛЬНЫЙ. Текст комментария. Поддерживает markdown форматирование.',
      {
        examples: [
          'Задача выполнена',
          'Нужна дополнительная информация от заказчика',
          '## Обновление\n\nДобавлена новая функциональность.',
        ],
      }
    );
  }

  /**
   * Построить описание параметра attachmentIds
   */
  private buildAttachmentIdsParam(): Record<string, unknown> {
    return this.buildArrayParam(
      'Опциональный массив идентификаторов вложений для прикрепления к комментарию.',
      {
        itemsType: 'string',
        examples: [['att-123', 'att-456']],
      }
    );
  }

  /**
   * Построить описание параметра fields
   */
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
