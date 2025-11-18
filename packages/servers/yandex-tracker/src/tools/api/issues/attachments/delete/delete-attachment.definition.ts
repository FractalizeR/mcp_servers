/**
 * Определение MCP tool для удаления файла из задачи
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { DeleteAttachmentTool } from './delete-attachment.tool.js';

/**
 * Definition для DeleteAttachmentTool
 *
 * Предоставляет детальное описание для ИИ агента:
 * - Что делает инструмент
 * - Какие параметры принимает
 * - Примеры использования
 * - Предупреждения об необратимости операции
 */
export class DeleteAttachmentDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return DeleteAttachmentTool.METADATA;
  }

  build(): ToolDefinition {
    return {
      name: this.getToolName(),
      description: this.wrapWithSafetyWarning(this.buildDescription()),
      inputSchema: {
        type: 'object',
        properties: {
          issueId: this.buildIssueIdParam(),
          attachmentId: this.buildAttachmentIdParam(),
        },
        required: ['issueId', 'attachmentId'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Удалить прикрепленный файл из задачи Яндекс.Трекера. ' +
      '⚠️ ВНИМАНИЕ: Операция необратима! Файл будет удален безвозвратно. ' +
      '\n\n' +
      'Для: удаления устаревших документов, ошибочно загруженных файлов. ' +
      '\n' +
      'Не для: загрузки/скачивания файлов (upload_attachment, download_attachment).' +
      '\n\n' +
      'ВАЖНО: Получить attachmentId можно через get_attachments.'
    );
  }

  /**
   * Построить описание параметра issueId
   */
  private buildIssueIdParam(): Record<string, unknown> {
    return this.buildStringParam('Ключ или ID задачи (формат QUEUE-123 или abc123)', {
      pattern: '^([A-Z][A-Z0-9]+-\\d+|[a-f0-9]+)$',
      examples: ['PROJ-123', 'abc123def456'],
    });
  }

  /**
   * Построить описание параметра attachmentId
   */
  private buildAttachmentIdParam(): Record<string, unknown> {
    return this.buildStringParam(
      'ID прикрепленного файла для удаления (получить через get_attachments)',
      {
        minLength: 1,
        examples: ['12345', 'abc123'],
      }
    );
  }
}
