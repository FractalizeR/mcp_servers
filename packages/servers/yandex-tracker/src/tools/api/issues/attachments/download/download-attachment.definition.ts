/**
 * Определение MCP tool для скачивания файла из задачи
 */

import {
  BaseToolDefinition,
  type ToolDefinition,
  type StaticToolMetadata,
} from '@mcp-framework/core';
import { DOWNLOAD_ATTACHMENT_TOOL_METADATA } from './download-attachment.metadata.js';

/**
 * Definition для DownloadAttachmentTool
 *
 * Предоставляет детальное описание для ИИ агента:
 * - Что делает инструмент
 * - Какие параметры принимает
 * - Примеры использования
 * - Формат ответа
 */
export class DownloadAttachmentDefinition extends BaseToolDefinition {
  protected getStaticMetadata(): StaticToolMetadata {
    return DOWNLOAD_ATTACHMENT_TOOL_METADATA;
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
          filename: this.buildFilenameParam(),
          saveToPath: this.buildSaveToPathParam(),
        },
        required: ['issueId', 'attachmentId', 'filename'],
      },
    };
  }

  /**
   * Построить описание инструмента
   */
  private buildDescription(): string {
    return (
      'Скачивает файл (issueId*, attachmentId*, filename*, saveToPath). ' +
      'По умолчанию возвращает base64. Опционально можно сохранить на MCP сервере (saveToPath). ' +
      'Требуются: issueId, attachmentId, filename (получить через get_attachments). ' +
      'Для загрузки/удаления: upload_attachment, delete_attachment.'
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
    return this.buildStringParam('ID прикрепленного файла (получить через get_attachments)', {
      minLength: 1,
      examples: ['12345', 'abc123'],
    });
  }

  /**
   * Построить описание параметра filename
   */
  private buildFilenameParam(): Record<string, unknown> {
    return this.buildStringParam('Имя файла (получить через get_attachments)', {
      minLength: 1,
      examples: ['report.pdf', 'screenshot.png'],
    });
  }

  /**
   * Построить описание параметра saveToPath
   */
  private buildSaveToPathParam(): Record<string, unknown> {
    return {
      type: 'string',
      description:
        'Путь для сохранения на MCP сервере (опционально). ' +
        'Если не указан, файл вернется в base64.',
    };
  }
}
