/**
 * Определение MCP tool для получения списка файлов задачи
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { GET_ATTACHMENTS_TOOL_METADATA } from './get-attachments.metadata.js';

/**
 * Definition для GetAttachmentsTool
 *
 * Предоставляет детальное описание для ИИ агента:
 * - Что делает инструмент
 * - Какие параметры принимает
 * - Примеры использования
 * - Формат ответа
 */
export class GetAttachmentsDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return GET_ATTACHMENTS_TOOL_METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          issueId: this.buildIssueIdParam(),
          fields: this.buildFieldsParam(),
        },
        required: ['issueId', 'fields'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Получить список всех прикрепленных файлов задачи (attachments). ' +
      'Обязательные поля: issueId и fields. ' +
      'Параметр fields определяет, какие поля каждого файла вернуть в ответе (например: ["id", "name", "size"]). ' +
      '\n\n' +
      'Для: просмотра прикрепленных файлов, анализа вложений, проверки наличия документов. ' +
      '\n' +
      'Не для: загрузки/скачивания/удаления файлов (upload_attachment, download_attachment, delete_attachment).'
    );
  }

  /**
   * Построить описание параметра issueId
   */
  private buildIssueIdParam(): Record<string, unknown> {
    return this.buildStringParam(
      'Ключ или ID задачи для получения списка файлов (формат QUEUE-123 или abc123)',
      {
        pattern: '^([A-Z][A-Z0-9]+-\\d+|[a-f0-9]+)$',
        examples: ['PROJ-123', 'abc123def456'],
      }
    );
  }

  /**
   * Построить описание параметра fields
   */
  private buildFieldsParam(): Record<string, unknown> {
    return this.buildArrayParam(
      '⚠️ ОБЯЗАТЕЛЬНЫЙ. Массив полей для возврата в результате. ' +
        'Указывайте только необходимые поля для экономии токенов. ' +
        '\n\n' +
        'Доступные поля: id, name, mimetype, size, content (downloadUrl), thumbnail, createdBy, createdAt.',
      {
        items: { type: 'string' },
        examples: [
          ['id', 'name', 'size'],
          ['id', 'name', 'mimetype', 'size'],
          ['id', 'name', 'size', 'createdBy.display', 'createdAt'],
        ],
      }
    );
  }
}
