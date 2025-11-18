/**
 * Определение MCP tool для получения списка файлов задачи
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { GetAttachmentsTool } from './get-attachments.tool.js';

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
    return GetAttachmentsTool.METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          issueId: this.buildIssueIdParam(),
        },
        required: ['issueId'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Получить список всех прикрепленных файлов задачи (attachments). ' +
      'Возвращает массив файлов с информацией о имени, размере, типе и URL для скачивания. ' +
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
}
