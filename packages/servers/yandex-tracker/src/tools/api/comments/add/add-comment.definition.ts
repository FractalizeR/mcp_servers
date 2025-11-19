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
        },
        required: ['issueId', 'text'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Добавить комментарий к задаче. Обязательные поля: issueId и text. ' +
      'Можно прикрепить вложения через attachmentIds. ' +
      '\n\n' +
      'Для: добавления комментария с текстом и опциональными вложениями. ' +
      '\n' +
      'Не для: редактирования (edit_comment), получения (get_comments), удаления (delete_comment).'
    );
  }

  /**
   * Построить описание параметра issueId
   */
  private buildIssueIdParam(): Record<string, unknown> {
    return this.buildStringParam(
      '⚠️ ОБЯЗАТЕЛЬНЫЙ. Идентификатор или ключ задачи (примеры: TEST-123, PROJ-456).',
      {
        examples: ['TEST-123', 'PROJ-456'],
      }
    );
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
}
